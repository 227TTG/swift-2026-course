# Architecture Patterns

> **Build apps that scale from 1K to 1M users**

## 🎯 The Right Architecture for Your App

| App Type | Best Pattern | Why |
|----------|-------------|-----|
| Simple CRUD | MVVM | Easy to learn, SwiftUI native |
| Complex state | TCA | Predictable, testable |
| Large team | Clean + MVVM | Clear boundaries |
| Prototype | No pattern | Ship fast, refactor later |

**Truth**: Start simple. Refactor when you feel pain.

## 🚀 MVVM: Start Here

### The 15-Minute Todo App

```swift
// Model
struct Todo: Identifiable {
    let id = UUID()
    var title: String
    var isCompleted: Bool
}

// ViewModel
@Observable
class TodoViewModel {
    var todos: [Todo] = []
    var newTodoTitle = ""
    
    func addTodo() {
        guard !newTodoTitle.isEmpty else { return }
        todos.append(Todo(title: newTodoTitle, isCompleted: false))
        newTodoTitle = ""
    }
    
    func toggleTodo(_ todo: Todo) {
        guard let index = todos.firstIndex(where: { $0.id == todo.id }) else { return }
        todos[index].isCompleted.toggle()
    }
    
    func deleteTodo(_ todo: Todo) {
        todos.removeAll { $0.id == todo.id }
    }
}

// View
struct TodoListView: View {
    @State private var viewModel = TodoViewModel()
    
    var body: some View {
        NavigationStack {
            VStack {
                // Input
                HStack {
                    TextField("New todo", text: $viewModel.newTodoTitle)
                        .textFieldStyle(.roundedBorder)
                    
                    Button("Add") {
                        viewModel.addTodo()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                
                // List
                List {
                    ForEach(viewModel.todos) { todo in
                        HStack {
                            Image(systemName: todo.isCompleted ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(todo.isCompleted ? .green : .gray)
                                .onTapGesture {
                                    viewModel.toggleTodo(todo)
                                }
                            
                            Text(todo.title)
                                .strikethrough(todo.isCompleted)
                        }
                    }
                    .onDelete { indexSet in
                        indexSet.forEach { index in
                            viewModel.deleteTodo(viewModel.todos[index])
                        }
                    }
                }
            }
            .navigationTitle("Todos")
        }
    }
}
```

**What you learned**:
- Model = Data structure
- ViewModel = Business logic
- View = UI only
- `@Observable` = Auto UI updates

**When to use**: 90% of apps. Start here.

## 🏗️ Add Persistence (SwiftData)

```swift
import SwiftData

@Model
final class TodoItem {
    var title: String
    var isCompleted: Bool
    var createdAt: Date
    
    init(title: String) {
        self.title = title
        self.isCompleted = false
        self.createdAt = Date()
    }
}

@Observable
class TodoViewModel {
    private let modelContext: ModelContext
    
    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    func addTodo(title: String) {
        let todo = TodoItem(title: title)
        modelContext.insert(todo)
        try? modelContext.save()
    }
    
    func toggleTodo(_ todo: TodoItem) {
        todo.isCompleted.toggle()
        try? modelContext.save()
    }
}

// In App
@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup {
            TodoListView()
        }
        .modelContainer(for: TodoItem.self)
    }
}

// In View
struct TodoListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \TodoItem.createdAt, order: .reverse) private var todos: [TodoItem]
    
    var body: some View {
        List(todos) { todo in
            TodoRow(todo: todo)
        }
    }
}
```

**Upgrade**: Data persists automatically. Zero boilerplate.

## 🎯 Add Networking

```swift
actor TodoService {
    private let baseURL = URL(string: "https://api.example.com")!
    
    func fetchTodos() async throws -> [TodoDTO] {
        let url = baseURL.appendingPathComponent("todos")
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([TodoDTO].self, from: data)
    }
    
    func createTodo(title: String) async throws -> TodoDTO {
        var request = URLRequest(url: baseURL.appendingPathComponent("todos"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["title": title]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TodoDTO.self, from: data)
    }
}

struct TodoDTO: Codable {
    let id: String
    let title: String
    let isCompleted: Bool
}

// Updated ViewModel
@Observable
class TodoViewModel {
    var todos: [Todo] = []
    var isLoading = false
    var error: Error?
    
    private let service = TodoService()
    
    func loadTodos() async {
        isLoading = true
        error = nil
        
        do {
            let dtos = try await service.fetchTodos()
            todos = dtos.map { Todo(from: $0) }
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
}
```

**Pattern**: Service layer handles API. ViewModel coordinates.

## 🔄 Repository Pattern (Advanced)

```swift
protocol TodoRepository {
    func fetchTodos() async throws -> [Todo]
    func saveTodo(_ todo: Todo) async throws
    func deleteTodo(_ id: UUID) async throws
}

// Remote implementation
actor RemoteTodoRepository: TodoRepository {
    private let service: TodoService
    
    init(service: TodoService) {
        self.service = service
    }
    
    func fetchTodos() async throws -> [Todo] {
        let dtos = try await service.fetchTodos()
        return dtos.map { Todo(from: $0) }
    }
    
    func saveTodo(_ todo: Todo) async throws {
        _ = try await service.createTodo(title: todo.title)
    }
    
    func deleteTodo(_ id: UUID) async throws {
        try await service.deleteTodo(id: id.uuidString)
    }
}

// Local implementation
actor LocalTodoRepository: TodoRepository {
    private let modelContext: ModelContext
    
    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    func fetchTodos() async throws -> [Todo] {
        let descriptor = FetchDescriptor<TodoItem>()
        let items = try modelContext.fetch(descriptor)
        return items.map { Todo(from: $0) }
    }
    
    func saveTodo(_ todo: Todo) async throws {
        let item = TodoItem(title: todo.title)
        modelContext.insert(item)
        try modelContext.save()
    }
    
    func deleteTodo(_ id: UUID) async throws {
        // Delete from SwiftData
    }
}

// ViewModel doesn't care which!
@Observable
class TodoViewModel {
    var todos: [Todo] = []
    private let repository: TodoRepository
    
    init(repository: TodoRepository) {
        self.repository = repository
    }
    
    func loadTodos() async {
        todos = try await repository.fetchTodos()
    }
}
```

**Why**: Swap implementations easily. Test with mock repository.

## 🧪 Testing Made Easy

```swift
// Mock repository for tests
actor MockTodoRepository: TodoRepository {
    var mockTodos: [Todo] = []
    var shouldFail = false
    
    func fetchTodos() async throws -> [Todo] {
        if shouldFail {
            throw TestError.failed
        }
        return mockTodos
    }
    
    func saveTodo(_ todo: Todo) async throws {
        mockTodos.append(todo)
    }
    
    func deleteTodo(_ id: UUID) async throws {
        mockTodos.removeAll { $0.id == id }
    }
}

enum TestError: Error {
    case failed
}

// Test
@Test
func testLoadTodos() async throws {
    let mock = MockTodoRepository()
    mock.mockTodos = [
        Todo(title: "Test 1", isCompleted: false),
        Todo(title: "Test 2", isCompleted: true)
    ]
    
    let viewModel = TodoViewModel(repository: mock)
    await viewModel.loadTodos()
    
    #expect(viewModel.todos.count == 2)
    #expect(viewModel.todos[0].title == "Test 1")
}
```

**Win**: Test business logic without UI or network.

## 🎯 Real App Structure

```
MyApp/
├── App/
│   ├── MyApp.swift
│   └── AppDelegate.swift
├── Features/
│   ├── Todos/
│   │   ├── Views/
│   │   │   ├── TodoListView.swift
│   │   │   └── TodoDetailView.swift
│   │   ├── ViewModels/
│   │   │   └── TodoViewModel.swift
│   │   └── Models/
│   │       └── Todo.swift
│   └── Settings/
│       └── ...
├── Core/
│   ├── Networking/
│   │   ├── NetworkManager.swift
│   │   └── APIEndpoint.swift
│   ├── Persistence/
│   │   └── ModelContainer.swift
│   └── Extensions/
│       └── View+Extensions.swift
└── Resources/
    ├── Assets.xcassets
    └── Localizable.strings
```

**Rule**: Group by feature, not layer.

## 🚀 Dependency Injection

```swift
// Container
@Observable
class AppDependencies {
    let todoRepository: TodoRepository
    let userRepository: UserRepository
    let analytics: AnalyticsService
    
    init() {
        // Production dependencies
        self.todoRepository = RemoteTodoRepository(
            service: TodoService()
        )
        self.userRepository = RemoteUserRepository()
        self.analytics = FirebaseAnalytics()
    }
    
    // Test initializer
    init(
        todoRepository: TodoRepository,
        userRepository: UserRepository,
        analytics: AnalyticsService
    ) {
        self.todoRepository = todoRepository
        self.userRepository = userRepository
        self.analytics = analytics
    }
}

// In App
@main
struct MyApp: App {
    @State private var dependencies = AppDependencies()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(dependencies)
        }
    }
}

// In View
struct TodoListView: View {
    @Environment(AppDependencies.self) private var dependencies
    @State private var viewModel: TodoViewModel?
    
    var body: some View {
        List {
            // ...
        }
        .task {
            viewModel = TodoViewModel(repository: dependencies.todoRepository)
            await viewModel?.loadTodos()
        }
    }
}
```

**Benefit**: Easy to test, easy to swap implementations.

## 📊 Error Handling Pattern

```swift
enum AppError: LocalizedError {
    case networkError(Error)
    case decodingError
    case unauthorized
    case notFound
    
    var errorDescription: String? {
        switch self {
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError:
            return "Failed to parse response"
        case .unauthorized:
            return "Please log in again"
        case .notFound:
            return "Resource not found"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .networkError:
            return "Check your internet connection"
        case .unauthorized:
            return "Tap to log in"
        case .notFound:
            return "Try refreshing"
        default:
            return nil
        }
    }
}

// In ViewModel
@Observable
class TodoViewModel {
    var error: AppError?
    var showError = false
    
    func loadTodos() async {
        do {
            todos = try await repository.fetchTodos()
        } catch let error as URLError {
            self.error = .networkError(error)
            showError = true
        } catch {
            self.error = .decodingError
            showError = true
        }
    }
}

// In View
.alert("Error", isPresented: $viewModel.showError) {
    Button("OK") { }
    if let suggestion = viewModel.error?.recoverySuggestion {
        Button(suggestion) {
            // Handle recovery
        }
    }
} message: {
    if let error = viewModel.error {
        Text(error.localizedDescription)
    }
}
```

## 🎯 Quick Reference

### When to Use What

**MVVM**: 
- ✅ Most apps
- ✅ SwiftUI native
- ✅ Easy to learn

**Repository Pattern**:
- ✅ Multiple data sources
- ✅ Need offline support
- ✅ Want testability

**Dependency Injection**:
- ✅ Large apps
- ✅ Multiple teams
- ✅ Need mocking

**Clean Architecture**:
- ✅ Very large apps
- ✅ Long-term maintenance
- ❌ Overkill for small apps

## 💡 Pro Tips

1. **Start simple**: MVVM is enough for 90% of apps
2. **Add complexity when needed**: Not before
3. **Test business logic**: Not UI
4. **Keep ViewModels thin**: Move logic to services
5. **Use actors for shared state**: Prevent data races

## 🔗 Next Steps

- [Testing Strategies →](./testing.md)
- [CI/CD →](./cicd.md)
- [Security →](./security.md)

---

**Remember**: Good architecture emerges from refactoring, not upfront design.
