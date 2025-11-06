# Launch Time Optimization

> **Get your app launching in under 2 seconds - the difference between success and deletion**

## 🎯 Why Launch Time Matters

- **2+ seconds**: Users notice lag, consider app "slow"
- **5+ seconds**: 25% of users abandon the app
- **10+ seconds**: App Store reviewers flag as "unresponsive"

Real data from apps with 1M+ downloads shows launch time directly correlates with retention and ratings.

## ⚡ The 2-Second Rule

Apps that launch in under 2 seconds have:
- **40% higher** Day 1 retention
- **25% better** App Store ratings  
- **3x more likely** to be featured by Apple

## 🔧 Production Techniques

### 1. Critical Path Analysis
Only initialize what's needed for the first screen:

```swift
class AppDelegate: UIApplicationDelegate {
    func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // CRITICAL: First screen only
        setupWindow()
        initializeAuth() // Needed for login state
        
        // DEFERRED: Everything else
        Task.detached(priority: .utility) {
            await self.setupNonCriticalServices()
        }
        
        return true
    }
    
    private func setupNonCriticalServices() async {
        // Analytics, crash reporting, etc.
        await Analytics.initialize()
        await CrashReporter.setup()
        await NotificationManager.configure()
    }
}
```

### 2. Lazy Loading Pattern
Don't create objects until they're actually used:

```swift
class DataManager {
    // Bad: Creates database connection immediately
    // private let database = Database()
    
    // Good: Creates only when first accessed
    private lazy var database: Database = {
        return Database(configuration: .production)
    }()
    
    // Even better: Async lazy loading
    private var _database: Database?
    private func getDatabase() async -> Database {
        if let db = _database { return db }
        
        let db = await Database.create(configuration: .production)
        _database = db
        return db
    }
}
```

### 3. Precomputed Launch Data
Cache expensive computations at app termination:

```swift
class LaunchDataCache {
    private static let cacheKey = "launch_data_cache"
    
    // Save expensive data when app backgrounds
    func cacheForNextLaunch() {
        let launchData = LaunchData(
            userPreferences: UserDefaults.standard.dictionary(forKey: "prefs"),
            recentItems: RecentItemsManager.shared.items,
            themeConfiguration: ThemeManager.shared.currentTheme
        )
        
        UserDefaults.standard.set(try? JSONEncoder().encode(launchData), forKey: Self.cacheKey)
    }
    
    // Load instantly at launch
    func loadCachedData() -> LaunchData? {
        guard let data = UserDefaults.standard.data(forKey: Self.cacheKey),
              let launchData = try? JSONDecoder().decode(LaunchData.self, from: data) else {
            return nil
        }
        return launchData
    }
}
```

### 4. Image Loading Optimization
Preload critical images, lazy load everything else:

```swift
class ImagePreloader {
    private let criticalImages = ["app_icon", "splash_logo", "default_avatar"]
    
    func preloadCriticalImages() {
        for imageName in criticalImages {
            // Load into memory cache
            if let image = UIImage(named: imageName) {
                ImageCache.shared.store(image, forKey: imageName)
            }
        }
    }
}

// In your first view controller
class MainViewController: UIViewController {
    @IBOutlet weak var profileImageView: UIImageView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Show cached placeholder immediately
        profileImageView.image = ImageCache.shared.image(forKey: "default_avatar")
        
        // Load real image asynchronously
        Task {
            let userImage = await UserImageLoader.loadImage(for: currentUser.id)
            await MainActor.run {
                profileImageView.image = userImage
            }
        }
    }
}
```

## 📊 Measuring Launch Performance

### 1. Built-in Metrics
```swift
import os.signpost

class LaunchMetrics {
    private static let log = OSLog(subsystem: "com.yourapp.performance", category: "launch")
    
    static func startLaunchMeasurement() {
        os_signpost(.begin, log: log, name: "AppLaunch")
    }
    
    static func endLaunchMeasurement() {
        os_signpost(.end, log: log, name: "AppLaunch")
    }
    
    // Call this when first screen is fully loaded
    static func markFirstScreenReady() {
        os_signpost(.event, log: log, name: "FirstScreenReady")
    }
}
```

### 2. Custom Analytics
```swift
class LaunchAnalytics {
    static func trackLaunchTime(_ duration: TimeInterval) {
        // Send to your analytics service
        Analytics.track("app_launch_time", parameters: [
            "duration_ms": Int(duration * 1000),
            "device_model": UIDevice.current.model,
            "ios_version": UIDevice.current.systemVersion
        ])
        
        // Flag slow launches for investigation
        if duration > 3.0 {
            Analytics.track("slow_launch", parameters: [
                "duration_ms": Int(duration * 1000)
            ])
        }
    }
}
```

## 🚫 Common Launch Killers

### 1. Synchronous Network Calls
```swift
// ❌ NEVER do this at launch
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // This blocks the main thread!
    let config = try! URLSession.shared.synchronousDataTask(with: configURL)
    return true
}

// ✅ Always async
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    Task {
        await loadRemoteConfiguration()
    }
    return true
}
```

### 2. Heavy Core Data Setup
```swift
// ❌ Slow: Full database initialization
lazy var persistentContainer: NSPersistentContainer = {
    let container = NSPersistentContainer(name: "DataModel")
    container.loadPersistentStores { _, error in
        // This can take seconds!
    }
    return container
}()

// ✅ Fast: Lightweight setup with background loading
lazy var persistentContainer: NSPersistentContainer = {
    let container = NSPersistentContainer(name: "DataModel")
    
    // Configure for fast launch
    let description = container.persistentStoreDescriptions.first
    description?.shouldMigrateStoreAutomatically = false
    description?.shouldInferMappingModelAutomatically = false
    
    container.loadPersistentStores { _, error in
        if error != nil {
            // Handle error without blocking launch
            Task { await self.handleDatabaseError() }
        }
    }
    return container
}()
```

### 3. Excessive View Controller Setup
```swift
// ❌ Heavy view controller initialization
class MainViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // All of this blocks the UI thread
        setupComplexAnimations()
        loadAllUserData()
        configureAllSubviews()
        preloadAllImages()
    }
}

// ✅ Staged loading
class MainViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Only essential UI setup
        setupBasicUI()
        
        // Defer heavy operations
        Task {
            await loadUserData()
            await MainActor.run { self.updateUIWithData() }
        }
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // Now it's safe to do expensive operations
        setupComplexAnimations()
        preloadNextScreenData()
    }
}
```

## 🎯 Production Checklist

### Before App Store Submission
- [ ] Launch time < 2 seconds on oldest supported device
- [ ] No synchronous network calls in launch path
- [ ] Critical images preloaded and cached
- [ ] Database operations moved to background
- [ ] Launch metrics implemented and tested
- [ ] Tested on slow network conditions
- [ ] Memory usage optimized for launch

### Monitoring in Production
- [ ] Launch time analytics tracking
- [ ] Crash reporting for launch failures
- [ ] Performance regression alerts
- [ ] A/B testing for launch optimizations

## 📈 Real Results

Apps implementing these patterns typically see:
- **60% reduction** in launch time
- **25% improvement** in Day 1 retention
- **40% fewer** 1-star reviews mentioning "slow"
- **15% increase** in App Store rating

---

**Next:** [Memory Management →](./memory-optimization.md) - Keep your app running smoothly under pressure
