# Concurrency & Actors

> **Stop data races. Write safe concurrent code.**

## 🎯 The Problem We're Solving

```swift
// ❌ This crashes randomly
class DataManager {
    var items: [String] = []
    
    func addItem(_ item: String) {
        items.append(item) // CRASH: Data race!
    }
}

// Multiple threads calling addItem() = 💥
```

**The fix**: Actors.

## 🚀 Actors: Your New Best Friend

```swift
// ✅ This is safe
actor DataManager {
    private var items: [String] = []
    
    func addItem(_ item: String) {
        items.append(item) // Safe! Actor protects this
    }
    
    func getItems() -> [String] {
        items
    }
}

// Usage
let manager = DataManager()
await manager.addItem("Hello") // Note the 'await'
let items = await manager.getItems()
```

**What just happened**:
- Actor ensures only ONE task accesses `items` at a time
- `await` means "this might wait for other tasks to finish"
- No crashes, no data races, no locks needed

## 📱 Real Example: Image Downloader

```swift
actor ImageCache {
    private var cache: [URL: UIImage] = [:]
    private var inProgress: [URL: Task<UIImage, Error>] = [:]
    
    func image(for url: URL) async throws -> UIImage {
        // Check cache first
        if let cached = cache[url] {
            return cached
        }
        
        // Check if already downloading
        if let task = inProgress[url] {
            return try await task.value
        }
        
        // Start new download
        let task = Task {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let image = UIImage(data: data) else {
                throw ImageError.invalidData
            }
            return image
        }
        
        inProgress[url] = task
        
        do {
            let image = try await task.value
            cache[url] = image
            inProgress[url] = nil
            return image
        } catch {
            inProgress[url] = nil
            throw error
        }
    }
}

enum ImageError: Error {
    case invalidData
}

// Usage in SwiftUI
struct ImageView: View {
    let url: URL
    @State private var image: UIImage?
    let cache = ImageCache()
    
    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
            } else {
                ProgressView()
            }
        }
        .task {
            image = try? await cache.image(for: url)
        }
    }
}
```

**Why this is powerful**:
- No duplicate downloads (checks `inProgress`)
- Thread-safe caching
- Automatic cleanup
- Simple to use

## 🔄 async/await Basics

### Before (Callback Hell)

```swift
// ❌ Pyramid of doom
func loadUserData(completion: @escaping (User?) -> Void) {
    fetchUserID { userID in
        guard let userID else {
            completion(nil)
            return
        }
        
        fetchUserProfile(userID) { profile in
            guard let profile else {
                completion(nil)
                return
            }
            
            fetchUserPosts(userID) { posts in
                let user = User(profile: profile, posts: posts)
                completion(user)
            }
        }
    }
}
```

### After (Clean)

```swift
// ✅ Linear and readable
func loadUserData() async throws -> User {
    let userID = try await fetchUserID()
    let profile = try await fetchUserProfile(userID)
    let posts = try await fetchUserPosts(userID)
    
    return User(profile: profile, posts: posts)
}
```

**Difference**: Code reads top-to-bottom. No nesting. Errors propagate naturally.

## ⚡ Parallel Execution

### Sequential (Slow)

```swift
// Takes 6 seconds total
func loadData() async throws -> (User, Posts, Comments) {
    let user = try await fetchUser() // 2 seconds
    let posts = try await fetchPosts() // 2 seconds
    let comments = try await fetchComments() // 2 seconds
    
    return (user, posts, comments)
}
```

### Parallel (Fast)

```swift
// Takes 2 seconds total (all at once!)
func loadData() async throws -> (User, Posts, Comments) {
    async let user = fetchUser()
    async let posts = fetchPosts()
    async let comments = fetchComments()
    
    return try await (user, posts, comments)
}
```

**Key**: `async let` starts tasks immediately. `await` waits for all to finish.

## 🎯 Task Groups for Dynamic Work

```swift
func downloadImages(urls: [URL]) async throws -> [UIImage] {
    try await withThrowingTaskGroup(of: UIImage.self) { group in
        // Start all downloads
        for url in urls {
            group.addTask {
                let (data, _) = try await URLSession.shared.data(from: url)
                guard let image = UIImage(data: data) else {
                    throw ImageError.invalidData
                }
                return image
            }
        }
        
        // Collect results
        var images: [UIImage] = []
        for try await image in group {
            images.append(image)
        }
        return images
    }
}

// Download 100 images in parallel!
let images = try await downloadImages(urls: imageURLs)
```

**Use case**: When you don't know how many tasks you need upfront.

## 🔒 @MainActor for UI Updates

```swift
@MainActor
class ViewModel: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = false
    
    func loadItems() async {
        isLoading = true
        
        // This runs on background
        let fetchedItems = await fetchItemsFromAPI()
        
        // This automatically runs on main thread
        items = fetchedItems
        isLoading = false
    }
}

// Usage
struct ContentView: View {
    @StateObject private var viewModel = ViewModel()
    
    var body: some View {
        List(viewModel.items) { item in
            Text(item.name)
        }
        .task {
            await viewModel.loadItems()
        }
    }
}
```

**Magic**: `@MainActor` ensures ALL property updates happen on main thread. No more crashes!

## 🎨 Real Pattern: Network Manager

```swift
actor NetworkManager {
    static let shared = NetworkManager()
    
    private var session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
    }
    
    func fetch<T: Decodable>(_ type: T.Type, from url: URL) async throws -> T {
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.invalidResponse
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    func post<T: Encodable, R: Decodable>(
        _ data: T,
        to url: URL,
        expecting: R.Type
    ) async throws -> R {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(data)
        
        let (responseData, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.invalidResponse
        }
        
        return try JSONDecoder().decode(R.self, from: responseData)
    }
}

enum NetworkError: Error {
    case invalidResponse
}

// Usage
struct User: Codable {
    let id: Int
    let name: String
}

let user = try await NetworkManager.shared.fetch(User.self, from: userURL)
```

**Why actor**: Multiple views can call this safely. No race conditions.

## 🚨 Common Mistakes

### 1. Forgetting await

```swift
actor Counter {
    var count = 0
    
    func increment() {
        count += 1
    }
}

let counter = Counter()
counter.increment() // ❌ Error: Call to actor method must be 'await'
await counter.increment() // ✅ Correct
```

### 2. Blocking the Main Thread

```swift
// ❌ Bad: Blocks UI
func loadData() {
    Task {
        let data = await fetchData()
        // Process data...
    }
}

// ✅ Good: Non-blocking
func loadData() async {
    let data = await fetchData()
    // Process data...
}
```

### 3. Not Using Task for Fire-and-Forget

```swift
// ❌ Bad: Doesn't actually run
func saveData() {
    async {
        await database.save(data)
    }
}

// ✅ Good: Runs in background
func saveData() {
    Task {
        await database.save(data)
    }
}
```

## 🎯 Practical Exercise

Build a weather app that:
1. Fetches weather for multiple cities in parallel
2. Caches results
3. Updates UI safely

```swift
actor WeatherCache {
    private var cache: [String: Weather] = [:]
    
    func weather(for city: String) async throws -> Weather {
        if let cached = cache[city] {
            return cached
        }
        
        let weather = try await fetchWeather(for: city)
        cache[city] = weather
        return weather
    }
    
    private func fetchWeather(for city: String) async throws -> Weather {
        let url = URL(string: "https://api.weather.com/\(city)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(Weather.self, from: data)
    }
}

@MainActor
class WeatherViewModel: ObservableObject {
    @Published var weatherData: [String: Weather] = [:]
    private let cache = WeatherCache()
    
    func loadWeather(for cities: [String]) async {
        await withTaskGroup(of: (String, Weather?).self) { group in
            for city in cities {
                group.addTask {
                    let weather = try? await self.cache.weather(for: city)
                    return (city, weather)
                }
            }
            
            for await (city, weather) in group {
                if let weather {
                    weatherData[city] = weather
                }
            }
        }
    }
}

struct Weather: Codable {
    let temperature: Double
    let condition: String
}
```

**Try it**: Add error handling, retry logic, and offline support.

## 📊 Performance Tips

1. **Use actors for shared state** (not locks)
2. **Batch UI updates** (don't update 100 times/second)
3. **Cancel tasks** when views disappear
4. **Use async let** for independent work
5. **Profile with Instruments** (Time Profiler)

## 🔗 Next Steps

- [Macros →](./macros.md) - Generate code at compile time
- [Memory Management →](./memory.md) - Understand ownership

---

**Key takeaway**: Actors + async/await = safe, fast, readable concurrent code. Use them everywhere.
