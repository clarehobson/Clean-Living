import StoreKit
import WebKit

let monthlyProductId = "app.cleanliving.recoverypro"
let annualProductId  = "app.cleanliving.recoverypro.annual"

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
        let ids: Set<String> = [monthlyProductId, annualProductId]
        let request = SKProductsRequest(productIdentifiers: ids)
        request.delegate = self
        request.start()
    }

    // MARK: - SKProductsRequestDelegate
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
            // Products not loaded yet — re-fetch and retry
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

    // MARK: - SKPaymentTransactionObserver
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
                let errMsg = transaction.error?.localizedDescription ?? "Purchase failed"
                // Don't send error for user cancellation
                if (transaction.error as? SKError)?.code != .paymentCancelled {
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
