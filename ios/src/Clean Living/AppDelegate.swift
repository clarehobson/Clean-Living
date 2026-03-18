import UIKit
import OneSignalFramework

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: 
                     [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        OneSignal.initialize("7976d6f8-e7ae-4424-a683-3b7e43fcc7ab", 
                            withLaunchOptions: launchOptions)
        
        OneSignal.Notifications.requestPermission({ accepted in
            print("User accepted notifications: \(accepted)")
        }, fallbackToSettings: true)

        return true
    }
}
