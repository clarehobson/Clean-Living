import UIKit
import WebKit
import OneSignalFramework
import StoreKit

var webView: WKWebView! = nil

// =====================
// IAP MANAGER
// =====================
let iapMonthlyId = "app.cleanliving.pro.monthly"
let iapAnnualId  = "app.cleanliving.pro.annual"

class IAPManager: NSObject, SKProductsRequestDelegate, SKPaymentTransactionObserver {

    static let shared = IAPManager()
    var products: [SKProduct] = []
    weak var webView: WKWebView?

    override init() {
        super.init()
        SKPaymentQueue.default().add(self)
        fetchProducts()
    }

    func fetchProducts() {
        let ids: Set<String> = [iapMonthlyId, iapAnnualId]
        let request = SKProductsRequest(productIdentifiers: ids)
        request.delegate = self
        request.start()
    }

    func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
        self.products = response.products
        sendProductsToWeb()
    }

    func sendProductsToWeb() {
        guard let webView = webView else { return }
        var productData: [[String: String]] = []
        for product in products {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.locale = product.priceLocale
            let price = formatter.string(from: product.price) ?? "\(product.price)"
            productData.append([
                "productId": product.productIdentifier,
                "price": price,
                "title": product.localizedTitle
            ])
        }
        if let data = try? JSONSerialization.data(withJSONObject: productData),
           let json = String(data: data, encoding: .utf8) {
            DispatchQueue.main.async {
                webView.evaluateJavaScript("window.onIAPProductsLoaded && window.onIAPProductsLoaded(\(json))", completionHandler: nil)
            }
        }
    }

    func purchase(productId: String) {
        guard SKPaymentQueue.canMakePayments() else {
            sendResultToWeb(success: false, productId: productId, error: "Payments not allowed on this device")
            return
        }
        guard let product = products.first(where: { $0.productIdentifier == productId }) else {
            fetchProducts()
            sendResultToWeb(success: false, productId: productId, error: "Product not found — please try again")
            return
        }
        let payment = SKPayment(product: product)
        SKPaymentQueue.default().add(payment)
    }

    func restorePurchases() {
        SKPaymentQueue.default().restoreCompletedTransactions()
    }

    func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        for transaction in transactions {
            switch transaction.transactionState {
            case .purchased:
                SKPaymentQueue.default().finishTransaction(transaction)
                sendResultToWeb(success: true, productId: transaction.payment.productIdentifier, error: nil)
            case .restored:
                SKPaymentQueue.default().finishTransaction(transaction)
                let productId = transaction.original?.payment.productIdentifier ?? ""
                sendResultToWeb(success: true, productId: productId, error: nil)
            case .failed:
                SKPaymentQueue.default().finishTransaction(transaction)
                if (transaction.error as? SKError)?.code != .paymentCancelled {
                    let errMsg = transaction.error?.localizedDescription ?? "Purchase failed"
                    sendResultToWeb(success: false, productId: transaction.payment.productIdentifier, error: errMsg)
                }
            default:
                break
            }
        }
    }

    func paymentQueueRestoreCompletedTransactionsFinished(_ queue: SKPaymentQueue) {
        if queue.transactions.isEmpty {
            sendResultToWeb(success: false, productId: "", error: "No purchases to restore")
        }
    }

    func sendResultToWeb(success: Bool, productId: String, error: String?) {
        guard let webView = webView else { return }
        let errorStr = error != nil ? "\"\(error!)\"" : "null"
        let js = "window.onIAPResult && window.onIAPResult(\(success), \"\(productId)\", \(errorStr))"
        DispatchQueue.main.async {
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

// =====================
// VIEW CONTROLLER
// =====================
class ViewController: UIViewController, WKNavigationDelegate, UIDocumentInteractionControllerDelegate {
    enum LoadingMode {
        case defaultCachePolicy
        case forceCache
    }

    var documentController: UIDocumentInteractionController?
    func documentInteractionControllerViewControllerForPreview(_ controller: UIDocumentInteractionController) -> UIViewController {
        return self
    }
    
    @IBOutlet weak var loadingView: UIView!
    @IBOutlet weak var progressView: UIProgressView!
    @IBOutlet weak var connectionProblemView: UIImageView!
    @IBOutlet weak var webviewView: UIView!
    var toolbarView: UIToolbar!
    
    var htmlIsLoaded = false;
    private var loadingMode = LoadingMode.defaultCachePolicy
    
    private var themeObservation: NSKeyValueObservation?
    var currentWebViewTheme: UIUserInterfaceStyle = .unspecified
    override var preferredStatusBarStyle : UIStatusBarStyle {
        if #available(iOS 13, *), overrideStatusBar{
            if #available(iOS 15, *) {
                return .default
            } else {
                return statusBarTheme == "dark" ? .lightContent : .darkContent
            }
        }
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        initWebView()
        initToolbarView()
        loadRootUrl()
        NotificationCenter.default.addObserver(self, selector: #selector(self.keyboardWillHide(_:)), name: UIResponder.keyboardWillHideNotification , object: nil)
        IAPManager.shared.webView = CleanLiving.webView
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        CleanLiving.webView.frame = calcWebviewFrame(webviewView: webviewView, toolbarView: nil)
    }
    
    @objc func keyboardWillHide(_ notification: NSNotification) {
        CleanLiving.webView.setNeedsLayout()
    }
    
    func initWebView() {
        CleanLiving.webView = createWebView(container: webviewView, WKSMH: self, WKND: self, NSO: self, VC: self)
        webviewView.addSubview(CleanLiving.webView);
        CleanLiving.webView.uiDelegate = self;
        CleanLiving.webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)

        if(pullToRefresh){
            let refreshControl = UIRefreshControl()
            refreshControl.addTarget(self, action: #selector(refreshWebView(_:)), for: UIControl.Event.valueChanged)
            CleanLiving.webView.scrollView.addSubview(refreshControl)
            CleanLiving.webView.scrollView.bounces = true
        }

        if #available(iOS 15.0, *), adaptiveUIStyle {
            themeObservation = CleanLiving.webView.observe(\.themeColor) { [unowned self] webView, _ in
                let backgroundColor = CleanLiving.webView.underPageBackgroundColor;
                let themeColor = CleanLiving.webView.themeColor;
                currentWebViewTheme = themeColor?.isLight() ?? backgroundColor?.isLight() ?? true ? .light : .dark
                self.overrideUIStyle()
                view.backgroundColor = themeColor ?? backgroundColor;
            }
        }
    }

    @objc func refreshWebView(_ sender: UIRefreshControl) {
        CleanLiving.webView?.reload()
        sender.endRefreshing()
    }

    func createToolbarView() -> UIToolbar{
        let winScene = UIApplication.shared.connectedScenes.first
        let windowScene = winScene as! UIWindowScene
        var statusBarHeight = windowScene.statusBarManager?.statusBarFrame.height ?? 60
        
        #if targetEnvironment(macCatalyst)
        if (statusBarHeight == 0){
            statusBarHeight = 30
        }
        #endif
        
        let toolbarView = UIToolbar(frame: CGRect(x: 0, y: 0, width: webviewView.frame.width, height: 0))
        toolbarView.sizeToFit()
        toolbarView.frame = CGRect(x: 0, y: 0, width: webviewView.frame.width, height: toolbarView.frame.height + statusBarHeight)
        let flex = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        let close = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(loadRootUrl))
        toolbarView.setItems([close,flex], animated: true)
        toolbarView.isHidden = true
        return toolbarView
    }
    
    func overrideUIStyle(toDefault: Bool = false) {
        if #available(iOS 15.0, *), adaptiveUIStyle {
            if (((htmlIsLoaded && !CleanLiving.webView.isHidden) || toDefault) && self.currentWebViewTheme != .unspecified) {
                UIApplication
                    .shared
                    .connectedScenes
                    .flatMap { ($0 as? UIWindowScene)?.windows ?? [] }
                    .first { $0.isKeyWindow }?.overrideUserInterfaceStyle = toDefault ? .unspecified : self.currentWebViewTheme;
            }
        }
    }
    
    func initToolbarView() {
        toolbarView = createToolbarView()
        webviewView.addSubview(toolbarView)
    }
    
    @objc func loadRootUrl(cachePolicy: NSURLRequest.CachePolicy = .useProtocolCachePolicy) {
        CleanLiving.webView.load(URLRequest(url: SceneDelegate.universalLinkToLaunch ?? SceneDelegate.shortcutLinkToLaunch ?? rootUrl, cachePolicy: cachePolicy))
    }
    
    func reloadWebview(loadingMode: LoadingMode = LoadingMode.defaultCachePolicy) {
        switch loadingMode {
        case LoadingMode.defaultCachePolicy:
            loadRootUrl(cachePolicy: .useProtocolCachePolicy);
        case LoadingMode.forceCache:
            loadRootUrl(cachePolicy: .useProtocolCachePolicy);
        }
        self.loadingMode = loadingMode
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!){
        htmlIsLoaded = true
        self.setProgress(1.0, true)
        self.animateConnectionProblem(false)
        IAPManager.shared.webView = CleanLiving.webView
        IAPManager.shared.sendProductsToWeb()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            CleanLiving.webView.isHidden = false
            self.loadingView.isHidden = true
            self.setProgress(0.0, false)
            self.overrideUIStyle()
        }
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        htmlIsLoaded = false;
        if (error as NSError)._code == (-999) { return }
        self.overrideUIStyle(toDefault: true);
        webView.isHidden = true;
        loadingView.isHidden = false;
        if loadingMode == LoadingMode.defaultCachePolicy {
            DispatchQueue.main.async {
                self.reloadWebview(loadingMode: LoadingMode.forceCache)
            }
        } else {
            animateConnectionProblem(true);
            setProgress(0.05, true);
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                self.setProgress(0.1, true);
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    self.reloadWebview()
                }
            }
        }
    }
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if (keyPath == #keyPath(WKWebView.estimatedProgress) &&
                CleanLiving.webView.isLoading &&
                !self.loadingView.isHidden &&
                !self.htmlIsLoaded) {
                    var progress = Float(CleanLiving.webView.estimatedProgress);
                    if (progress >= 0.8) { progress = 1.0; };
                    if (progress >= 0.3) { self.animateConnectionProblem(false); }
                    self.setProgress(progress, true);
        }
    }
    
    func setProgress(_ progress: Float, _ animated: Bool) {
        self.progressView.setProgress(progress, animated: animated);
    }
    
    func animateConnectionProblem(_ show: Bool) {
        if (show) {
            self.connectionProblemView.isHidden = false;
            self.connectionProblemView.alpha = 0
            UIView.animate(withDuration: 0.7, delay: 0, options: [.repeat, .autoreverse], animations: {
                self.connectionProblemView.alpha = 1
            })
        } else {
            UIView.animate(withDuration: 0.3, delay: 0, options: [], animations: {
                self.connectionProblemView.alpha = 0
            }, completion: { _ in
                self.connectionProblemView.isHidden = true;
                self.connectionProblemView.layer.removeAllAnimations();
            })
        }
    }
        
    deinit {
        CleanLiving.webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
    }
}

extension UIColor {
    func isLight(threshold: Float = 0.5) -> Bool? {
        let originalCGColor = self.cgColor
        let RGBCGColor = originalCGColor.converted(to: CGColorSpaceCreateDeviceRGB(), intent: .defaultIntent, options: nil)
        guard let components = RGBCGColor?.components else { return nil }
        guard components.count >= 3 else { return nil }
        let brightness = Float(((components[0] * 299) + (components[1] * 587) + (components[2] * 114)) / 1000)
        return (brightness > threshold)
    }
}

extension ViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "print" {
            printView(webView: CleanLiving.webView)
        } else if message.name == "iap-purchase" {
            if let body = message.body as? [String: Any],
               let productId = body["productId"] as? String {
                IAPManager.shared.purchase(productId: productId)
            }
        } else if message.name == "iap-restore" {
            IAPManager.shared.restorePurchases()
        }
    }
}
