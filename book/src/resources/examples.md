# Code Examples

> **Copy-paste ready code for common tasks**

## 🚀 Quick Start Projects

### 1. Todo App (15 min)

Complete MVVM app with SwiftData:

```swift
import SwiftUI
import SwiftData

// Model
@Model
final class Todo {
    var title: String
    var isCompleted: Bool
    
    init(title: String) {
        self.title = title
        self.isCompleted = false
    }
}

// App
@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup {
            TodoListView()
        }
        .modelContainer(for: Todo.self)
    }
}

// View
struct TodoListView: View {
    @Environment(\.modelContext) private var context
    @Query private var todos: [Todo]
    @State private var newTodo = ""
    
    var body: some View {
        NavigationStack {
            VStack {
                HStack {
                    TextField("New todo", text: $newTodo)
                    Button("Add") {
                        addTodo()
                    }
                }
                .padding()
                
                List {
                    ForEach(todos) { todo in
                        HStack {
                            Image(systemName: todo.isCompleted ? "checkmark.circle.fill" : "circle")
                                .onTapGesture {
                                    todo.isCompleted.toggle()
                                }
                            Text(todo.title)
                        }
                    }
                    .onDelete(perform: deleteTodos)
                }
            }
            .navigationTitle("Todos")
        }
    }
    
    private func addTodo() {
        guard !newTodo.isEmpty else { return }
        context.insert(Todo(title: newTodo))
        newTodo = ""
    }
    
    private func deleteTodos(at offsets: IndexSet) {
        offsets.forEach { context.delete(todos[$0]) }
    }
}
```

**Run it**: Create new iOS app, paste code, run!

### 2. Weather App (20 min)

Async networking with actors:

```swift
import SwiftUI

// Model
struct Weather: Codable {
    let temperature: Double
    let condition: String
    let city: String
}

// Service
actor WeatherService {
    func fetchWeather(for city: String) async throws -> Weather {
        let url = URL(string: "https://api.weather.com/\(city)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(Weather.self, from: data)
    }
}

// ViewModel
@Observable
class WeatherViewModel {
    var weather: Weather?
    var isLoading = false
    var error: String?
    
    private let service = WeatherService()
    
    func loadWeather(for city: String) async {
        isLoading = true
        error = nil
        
        do {
            weather = try await service.fetchWeather(for: city)
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
}

// View
struct WeatherView: View {
    @State private var viewModel = WeatherViewModel()
    @State private var city = "Detroit"
    
    var body: some View {
        VStack(spacing: 20) {
            TextField("City", text: $city)
                .textFieldStyle(.roundedBorder)
                .padding()
            
            if viewModel.isLoading {
                ProgressView()
            } else if let weather = viewModel.weather {
                VStack {
                    Text(weather.city)
                        .font(.title)
                    Text("\(Int(weather.temperature))°")
                        .font(.system(size: 72))
                    Text(weather.condition)
                        .font(.title2)
                }
            } else if let error = viewModel.error {
                Text(error)
                    .foregroundStyle(.red)
            }
            
            Button("Get Weather") {
                Task {
                    await viewModel.loadWeather(for: city)
                }
            }
            .buttonStyle(.borderedProminent)
        }
    }
}
```

### 3. Image Feed (30 min)

Instagram-style feed with caching:

```swift
import SwiftUI

// Cache
actor ImageCache {
    private var cache: [URL: UIImage] = [:]
    
    func image(for url: URL) -> UIImage? {
        cache[url]
    }
    
    func store(_ image: UIImage, for url: URL) {
        cache[url] = image
    }
}

// Post Model
struct Post: Identifiable {
    let id = UUID()
    let username: String
    let imageURL: String
    let caption: String
    let likes: Int
}

// View
struct FeedView: View {
    let posts = Post.samples
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(posts) { post in
                    PostCard(post: post)
                }
            }
        }
    }
}

struct PostCard: View {
    let post: Post
    @State private var isLiked = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                Text(post.username)
                    .fontWeight(.semibold)
                Spacer()
            }
            .padding(.horizontal)
            
            // Image
            AsyncImage(url: URL(string: post.imageURL)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray
            }
            .frame(height: 400)
            .clipped()
            
            // Actions
            HStack(spacing: 16) {
                Button {
                    isLiked.toggle()
                } label: {
                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .foregroundStyle(isLiked ? .red : .primary)
                }
                Button { } label: {
                    Image(systemName: "bubble.right")
                }
                Button { } label: {
                    Image(systemName: "paperplane")
                }
            }
            .font(.title2)
            .padding(.horizontal)
            
            // Caption
            Text("\(post.likes) likes")
                .fontWeight(.semibold)
                .padding(.horizontal)
            
            Text(post.caption)
                .padding(.horizontal)
        }
    }
}
```

## 🎯 Common Patterns

### Network Manager

```swift
actor NetworkManager {
    static let shared = NetworkManager()
    
    func fetch<T: Decodable>(_ type: T.Type, from url: URL) async throws -> T {
        let (data, _) = try await URLSession.shared.data(from: url)
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
        
        let (responseData, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(R.self, from: responseData)
    }
}
```

### Error Handling

```swift
enum AppError: LocalizedError {
    case networkError(Error)
    case decodingError
    case unauthorized
    
    var errorDescription: String? {
        switch self {
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError:
            return "Failed to parse response"
        case .unauthorized:
            return "Please log in"
        }
    }
}

// Usage
do {
    let data = try await fetchData()
} catch let error as URLError {
    throw AppError.networkError(error)
} catch {
    throw AppError.decodingError
}
```

### Loading States

```swift
enum LoadingState<T> {
    case idle
    case loading
    case success(T)
    case failure(Error)
}

@Observable
class ViewModel {
    var state: LoadingState<[Item]> = .idle
    
    func load() async {
        state = .loading
        
        do {
            let items = try await fetchItems()
            state = .success(items)
        } catch {
            state = .failure(error)
        }
    }
}

// In View
switch viewModel.state {
case .idle:
    Text("Tap to load")
case .loading:
    ProgressView()
case .success(let items):
    List(items) { item in
        Text(item.name)
    }
case .failure(let error):
    Text(error.localizedDescription)
}
```

## 🎨 UI Components

### Custom Button

```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue)
                .cornerRadius(12)
        }
    }
}
```

### Loading Overlay

```swift
struct LoadingOverlay: View {
    let isLoading: Bool
    
    var body: some View {
        if isLoading {
            ZStack {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)
            }
        }
    }
}

// Usage
.overlay {
    LoadingOverlay(isLoading: viewModel.isLoading)
}
```

### Empty State

```swift
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let action: (() -> Void)?
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            if let action {
                Button("Get Started", action: action)
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}
```

## 🔐 Authentication

```swift
@Observable
class AuthManager {
    var isAuthenticated = false
    var currentUser: User?
    
    func signIn(email: String, password: String) async throws {
        // API call
        let user = try await authService.signIn(email: email, password: password)
        currentUser = user
        isAuthenticated = true
    }
    
    func signOut() {
        currentUser = nil
        isAuthenticated = false
    }
}

// In App
@main
struct MyApp: App {
    @State private var authManager = AuthManager()
    
    var body: some Scene {
        WindowGroup {
            if authManager.isAuthenticated {
                MainView()
            } else {
                LoginView()
            }
        }
        .environment(authManager)
    }
}
```

## 📊 Analytics

```swift
import FirebaseAnalytics

struct AnalyticsManager {
    static func logEvent(_ name: String, parameters: [String: Any]? = nil) {
        Analytics.logEvent(name, parameters: parameters)
    }
    
    static func logScreenView(_ screenName: String) {
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [
            AnalyticsParameterScreenName: screenName
        ])
    }
    
    static func logPurchase(value: Decimal, currency: String = "USD") {
        Analytics.logEvent(AnalyticsEventPurchase, parameters: [
            AnalyticsParameterValue: NSDecimalNumber(decimal: value),
            AnalyticsParameterCurrency: currency
        ])
    }
}

// Usage
.onAppear {
    AnalyticsManager.logScreenView("Home")
}
```

## 🎯 Starter Templates

### MVVM Template

```swift
// Model
struct Item: Identifiable, Codable {
    let id: UUID
    var name: String
}

// Repository
protocol ItemRepository {
    func fetchItems() async throws -> [Item]
    func saveItem(_ item: Item) async throws
}

// ViewModel
@Observable
class ItemViewModel {
    var items: [Item] = []
    var isLoading = false
    var error: Error?
    
    private let repository: ItemRepository
    
    init(repository: ItemRepository) {
        self.repository = repository
    }
    
    func loadItems() async {
        isLoading = true
        do {
            items = try await repository.fetchItems()
        } catch {
            self.error = error
        }
        isLoading = false
    }
}

// View
struct ItemListView: View {
    @State private var viewModel: ItemViewModel
    
    init(repository: ItemRepository) {
        _viewModel = State(initialValue: ItemViewModel(repository: repository))
    }
    
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

## 🔗 Resources

- [Swift Documentation](https://swift.org/documentation/)
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [Sample Code](https://developer.apple.com/sample-code/)

---

**Tip**: Bookmark this page. Copy-paste these patterns into your projects.
