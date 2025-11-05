# Testing Strategies

> **Write tests that actually catch bugs**

## 🎯 The Testing Pyramid

```
        /\
       /UI\      10% - Slow, brittle
      /----\
     /Integ.\    20% - Medium speed
    /--------\
   /  Unit    \  70% - Fast, reliable
  /____________\
```

**Focus**: Write more unit tests, fewer UI tests.

## 🚀 Unit Testing with Swift Testing

### Your First Test (2 minutes)

```swift
import Testing

struct Calculator {
    func add(_ a: Int, _ b: Int) -> Int {
        a + b
    }
}

@Test
func testAddition() {
    let calculator = Calculator()
    let result = calculator.add(2, 3)
    #expect(result == 5)
}
```

**Run**: Cmd+U in Xcode. Green = pass, Red = fail.

### Test Async Code

```swift
actor DataManager {
    func fetchData() async throws -> [String] {
        try await Task.sleep(for: .seconds(1))
        return ["Item 1", "Item 2"]
    }
}

@Test
func testFetchData() async throws {
    let manager = DataManager()
    let data = try await manager.fetchData()
    
    #expect(data.count == 2)
    #expect(data[0] == "Item 1")
}
```

**Key**: Add `async throws` to test function.

## 🧪 Testing ViewModels

```swift
@Observable
class TodoViewModel {
    var todos: [Todo] = []
    var isLoading = false
    
    private let repository: TodoRepository
    
    init(repository: TodoRepository) {
        self.repository = repository
    }
    
    func loadTodos() async {
        isLoading = true
        todos = try await repository.fetchTodos()
        isLoading = false
    }
}

// Mock repository
actor MockTodoRepository: TodoRepository {
    var mockTodos: [Todo] = []
    var shouldFail = false
    var fetchCallCount = 0
    
    func fetchTodos() async throws -> [Todo] {
        fetchCallCount += 1
        
        if shouldFail {
            throw TestError.failed
        }
        
        return mockTodos
    }
}

// Tests
@Suite("TodoViewModel Tests")
struct TodoViewModelTests {
    
    @Test("Loads todos successfully")
    func testLoadTodos() async throws {
        // Arrange
        let mock = MockTodoRepository()
        mock.mockTodos = [
            Todo(title: "Test 1", isCompleted: false),
            Todo(title: "Test 2", isCompleted: true)
        ]
        let viewModel = TodoViewModel(repository: mock)
        
        // Act
        await viewModel.loadTodos()
        
        // Assert
        #expect(viewModel.todos.count == 2)
        #expect(viewModel.todos[0].title == "Test 1")
        #expect(mock.fetchCallCount == 1)
    }
    
    @Test("Shows loading state")
    func testLoadingState() async {
        let mock = MockTodoRepository()
        let viewModel = TodoViewModel(repository: mock)
        
        // Start loading
        Task {
            await viewModel.loadTodos()
        }
        
        // Check loading state
        try await Task.sleep(for: .milliseconds(10))
        #expect(viewModel.isLoading == true)
    }
    
    @Test("Handles errors")
    func testErrorHandling() async {
        let mock = MockTodoRepository()
        mock.shouldFail = true
        let viewModel = TodoViewModel(repository: mock)
        
        await viewModel.loadTodos()
        
        #expect(viewModel.todos.isEmpty)
        #expect(viewModel.error != nil)
    }
}

enum TestError: Error {
    case failed
}
```

**Pattern**: Arrange → Act → Assert

## 🎨 Testing SwiftUI Views

### Snapshot Testing

```swift
import SnapshotTesting
import SwiftUI

@Test
func testTodoRowAppearance() {
    let todo = Todo(title: "Buy milk", isCompleted: false)
    let view = TodoRow(todo: todo)
    
    assertSnapshot(of: view, as: .image)
}

@Test
func testCompletedTodoAppearance() {
    let todo = Todo(title: "Buy milk", isCompleted: true)
    let view = TodoRow(todo: todo)
    
    assertSnapshot(of: view, as: .image)
}
```

**Benefit**: Catches visual regressions automatically.

### View Testing with ViewInspector

```swift
import ViewInspector
import SwiftUI

@Test
func testTodoListDisplaysTodos() throws {
    let viewModel = TodoViewModel(repository: MockTodoRepository())
    viewModel.todos = [
        Todo(title: "Test", isCompleted: false)
    ]
    
    let view = TodoListView(viewModel: viewModel)
    let list = try view.inspect().find(ViewType.List.self)
    
    #expect(try list.count() == 1)
}
```

## 🌐 Testing Network Code

```swift
// Protocol for URLSession
protocol URLSessionProtocol {
    func data(from url: URL) async throws -> (Data, URLResponse)
}

extension URLSession: URLSessionProtocol {}

// Network manager
actor NetworkManager {
    private let session: URLSessionProtocol
    
    init(session: URLSessionProtocol = URLSession.shared) {
        self.session = session
    }
    
    func fetch<T: Decodable>(_ type: T.Type, from url: URL) async throws -> T {
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode(T.self, from: data)
    }
}

// Mock session
actor MockURLSession: URLSessionProtocol {
    var mockData: Data?
    var mockError: Error?
    
    func data(from url: URL) async throws -> (Data, URLResponse) {
        if let error = mockError {
            throw error
        }
        
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: nil,
            headerFields: nil
        )!
        
        return (mockData ?? Data(), response)
    }
}

// Test
@Test
func testNetworkFetch() async throws {
    let mockSession = MockURLSession()
    let mockUser = User(id: 1, name: "Test")
    mockSession.mockData = try JSONEncoder().encode(mockUser)
    
    let manager = NetworkManager(session: mockSession)
    let user = try await manager.fetch(User.self, from: URL(string: "https://api.test.com")!)
    
    #expect(user.name == "Test")
}
```

**Key**: Inject dependencies to make code testable.

## 🎯 Test Data Builders

```swift
struct TodoBuilder {
    private var title = "Default Todo"
    private var isCompleted = false
    private var createdAt = Date()
    
    func withTitle(_ title: String) -> Self {
        var builder = self
        builder.title = title
        return builder
    }
    
    func completed() -> Self {
        var builder = self
        builder.isCompleted = true
        return builder
    }
    
    func createdAt(_ date: Date) -> Self {
        var builder = self
        builder.createdAt = date
        return builder
    }
    
    func build() -> Todo {
        Todo(
            title: title,
            isCompleted: isCompleted,
            createdAt: createdAt
        )
    }
}

// Usage in tests
@Test
func testCompletedTodos() {
    let todo = TodoBuilder()
        .withTitle("Buy milk")
        .completed()
        .build()
    
    #expect(todo.isCompleted == true)
}
```

**Benefit**: Clean, readable test data creation.

## 🔄 Testing State Changes

```swift
@Test
func testTodoToggle() async {
    let viewModel = TodoViewModel(repository: MockTodoRepository())
    viewModel.todos = [
        Todo(title: "Test", isCompleted: false)
    ]
    
    let todo = viewModel.todos[0]
    #expect(todo.isCompleted == false)
    
    await viewModel.toggleTodo(todo)
    
    #expect(viewModel.todos[0].isCompleted == true)
}
```

## 🎭 Testing Edge Cases

```swift
@Suite("Edge Cases")
struct EdgeCaseTests {
    
    @Test("Empty list")
    func testEmptyList() async {
        let mock = MockTodoRepository()
        mock.mockTodos = []
        let viewModel = TodoViewModel(repository: mock)
        
        await viewModel.loadTodos()
        
        #expect(viewModel.todos.isEmpty)
    }
    
    @Test("Very long title")
    func testLongTitle() {
        let longTitle = String(repeating: "a", count: 1000)
        let todo = Todo(title: longTitle, isCompleted: false)
        
        #expect(todo.title.count == 1000)
    }
    
    @Test("Special characters")
    func testSpecialCharacters() {
        let title = "Test 🚀 with émojis & spëcial çhars"
        let todo = Todo(title: title, isCompleted: false)
        
        #expect(todo.title == title)
    }
    
    @Test("Concurrent modifications")
    func testConcurrentModifications() async {
        let viewModel = TodoViewModel(repository: MockTodoRepository())
        
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<100 {
                group.addTask {
                    await viewModel.addTodo(title: "Todo \(i)")
                }
            }
        }
        
        #expect(viewModel.todos.count == 100)
    }
}
```

## 📊 Code Coverage

```bash
# Run tests with coverage
xcodebuild test \
  -scheme YourApp \
  -enableCodeCoverage YES

# View coverage report
open DerivedData/.../Coverage.xcresult
```

**Target**: 70-80% coverage for business logic.

## 🚀 Performance Testing

```swift
@Test
func testFetchPerformance() async {
    let manager = DataManager()
    
    await #expect(
        duration: .seconds(1),
        {
            _ = try await manager.fetchData()
        }
    )
}
```

## 🎯 Integration Tests

```swift
@Test
func testFullUserFlow() async throws {
    // Setup real dependencies
    let container = ModelContainer(for: TodoItem.self)
    let context = ModelContext(container)
    let repository = LocalTodoRepository(modelContext: context)
    let viewModel = TodoViewModel(repository: repository)
    
    // Add todo
    await viewModel.addTodo(title: "Test")
    #expect(viewModel.todos.count == 1)
    
    // Toggle todo
    await viewModel.toggleTodo(viewModel.todos[0])
    #expect(viewModel.todos[0].isCompleted == true)
    
    // Delete todo
    await viewModel.deleteTodo(viewModel.todos[0])
    #expect(viewModel.todos.isEmpty)
}
```

## 🧪 UI Testing

```swift
import XCTest

final class TodoUITests: XCTestCase {
    
    func testAddTodo() throws {
        let app = XCUIApplication()
        app.launch()
        
        // Type in text field
        let textField = app.textFields["New todo"]
        textField.tap()
        textField.typeText("Buy milk")
        
        // Tap add button
        app.buttons["Add"].tap()
        
        // Verify todo appears
        XCTAssertTrue(app.staticTexts["Buy milk"].exists)
    }
    
    func testToggleTodo() throws {
        let app = XCUIApplication()
        app.launch()
        
        // Add todo
        app.textFields["New todo"].tap()
        app.textFields["New todo"].typeText("Test")
        app.buttons["Add"].tap()
        
        // Toggle
        app.images["circle"].tap()
        
        // Verify completed
        XCTAssertTrue(app.images["checkmark.circle.fill"].exists)
    }
}
```

## 💡 Best Practices

### 1. Test Behavior, Not Implementation

```swift
// ❌ Bad: Tests implementation
@Test
func testInternalState() {
    let viewModel = TodoViewModel()
    #expect(viewModel.internalCache.isEmpty)
}

// ✅ Good: Tests behavior
@Test
func testTodosLoadSuccessfully() async {
    let viewModel = TodoViewModel()
    await viewModel.loadTodos()
    #expect(!viewModel.todos.isEmpty)
}
```

### 2. One Assert Per Test

```swift
// ❌ Bad: Multiple unrelated asserts
@Test
func testEverything() {
    #expect(viewModel.todos.count == 2)
    #expect(viewModel.isLoading == false)
    #expect(viewModel.error == nil)
}

// ✅ Good: Focused tests
@Test
func testTodoCount() {
    #expect(viewModel.todos.count == 2)
}

@Test
func testNotLoading() {
    #expect(viewModel.isLoading == false)
}
```

### 3. Use Descriptive Names

```swift
// ❌ Bad
@Test
func test1() { }

// ✅ Good
@Test("Loads todos when view appears")
func testLoadsTodosOnViewAppear() { }
```

## 🎯 Quick Wins

1. **Test ViewModels first** (easiest, highest value)
2. **Mock external dependencies** (network, database)
3. **Use builders for test data** (cleaner tests)
4. **Run tests on CI** (catch bugs before merge)
5. **Aim for 70% coverage** (diminishing returns after)

## 🔗 Resources

- [Swift Testing](https://developer.apple.com/documentation/testing)
- [ViewInspector](https://github.com/nalexn/ViewInspector)
- [SnapshotTesting](https://github.com/pointfreeco/swift-snapshot-testing)

## 🔗 Next Steps

- [CI/CD →](./cicd.md) - Automate testing
- [Architecture →](./architecture.md) - Make code testable

---

**Remember**: Tests are documentation. Write them for future you.
