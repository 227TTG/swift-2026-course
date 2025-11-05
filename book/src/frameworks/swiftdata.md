# SwiftData

> **Build a notes app with persistence in 10 minutes**

## 🎯 What You'll Build

A fully functional notes app with:
- ✅ Create, read, update, delete
- ✅ Automatic persistence
- ✅ Search
- ✅ Sorting
- ✅ Relationships

**Zero SQL. Zero boilerplate.**

## 🚀 Step 1: Define Your Model (2 min)

```swift
import SwiftData
import Foundation

@Model
final class Note {
    var title: String
    var content: String
    var createdAt: Date
    var isFavorite: Bool
    
    init(title: String, content: String = "") {
        self.title = title
        self.content = content
        self.createdAt = Date()
        self.isFavorite = false
    }
}
```

**That's it.** SwiftData handles:
- Database schema
- Migrations
- Relationships
- Queries

## 📱 Step 2: Setup App (1 min)

```swift
import SwiftUI
import SwiftData

@main
struct NotesApp: App {
    var body: some Scene {
        WindowGroup {
            NotesListView()
        }
        .modelContainer(for: Note.self)
    }
}
```

**Done.** Database is ready.

## 📝 Step 3: Create Notes (3 min)

```swift
struct NotesListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Note.createdAt, order: .reverse) private var notes: [Note]
    @State private var showingAddNote = false
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(notes) { note in
                    NavigationLink(value: note) {
                        NoteRow(note: note)
                    }
                }
                .onDelete(perform: deleteNotes)
            }
            .navigationTitle("Notes")
            .navigationDestination(for: Note.self) { note in
                NoteDetailView(note: note)
            }
            .toolbar {
                Button {
                    showingAddNote = true
                } label: {
                    Image(systemName: "plus")
                }
            }
            .sheet(isPresented: $showingAddNote) {
                AddNoteView()
            }
        }
    }
    
    private func deleteNotes(at offsets: IndexSet) {
        for index in offsets {
            context.delete(notes[index])
        }
    }
}

struct NoteRow: View {
    let note: Note
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(note.title)
                    .font(.headline)
                
                if note.isFavorite {
                    Image(systemName: "star.fill")
                        .foregroundStyle(.yellow)
                }
            }
            
            Text(note.content)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)
            
            Text(note.createdAt, style: .relative)
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
    }
}
```

**Key points**:
- `@Query` automatically fetches and updates
- `@Environment(\.modelContext)` for CRUD operations
- Changes save automatically

## ✏️ Step 4: Edit Notes (2 min)

```swift
struct NoteDetailView: View {
    @Bindable var note: Note
    
    var body: some View {
        Form {
            TextField("Title", text: $note.title)
            
            TextEditor(text: $note.content)
                .frame(minHeight: 200)
            
            Toggle("Favorite", isOn: $note.isFavorite)
        }
        .navigationTitle("Edit Note")
    }
}
```

**Magic**: `@Bindable` + two-way binding = auto-save!

## ➕ Step 5: Add Notes (2 min)

```swift
struct AddNoteView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    
    @State private var title = ""
    @State private var content = ""
    
    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                TextEditor(text: $content)
                    .frame(minHeight: 200)
            }
            .navigationTitle("New Note")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveNote()
                    }
                    .disabled(title.isEmpty)
                }
            }
        }
    }
    
    private func saveNote() {
        let note = Note(title: title, content: content)
        context.insert(note)
        dismiss()
    }
}
```

## 🔍 Advanced Queries

### Filter by Favorite

```swift
@Query(
    filter: #Predicate<Note> { $0.isFavorite },
    sort: \Note.createdAt,
    order: .reverse
) 
private var favoriteNotes: [Note]
```

### Search

```swift
struct SearchableNotesView: View {
    @Query private var notes: [Note]
    @State private var searchText = ""
    
    var filteredNotes: [Note] {
        if searchText.isEmpty {
            return notes
        }
        return notes.filter { note in
            note.title.localizedCaseInsensitiveContains(searchText) ||
            note.content.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        List(filteredNotes) { note in
            NoteRow(note: note)
        }
        .searchable(text: $searchText)
    }
}
```

### Dynamic Sorting

```swift
struct SortableNotesView: View {
    @State private var sortOrder = SortOrder.date
    
    var body: some View {
        NotesListContent(sortOrder: sortOrder)
            .toolbar {
                Menu {
                    Picker("Sort", selection: $sortOrder) {
                        Text("Date").tag(SortOrder.date)
                        Text("Title").tag(SortOrder.title)
                        Text("Favorites").tag(SortOrder.favorite)
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                }
            }
    }
}

enum SortOrder {
    case date, title, favorite
}

struct NotesListContent: View {
    let sortOrder: SortOrder
    
    @Query private var notes: [Note]
    
    init(sortOrder: SortOrder) {
        self.sortOrder = sortOrder
        
        switch sortOrder {
        case .date:
            _notes = Query(sort: \Note.createdAt, order: .reverse)
        case .title:
            _notes = Query(sort: \Note.title)
        case .favorite:
            _notes = Query(sort: \Note.isFavorite, order: .reverse)
        }
    }
    
    var body: some View {
        List(notes) { note in
            NoteRow(note: note)
        }
    }
}
```

## 🔗 Relationships

### One-to-Many (Folders → Notes)

```swift
@Model
final class Folder {
    var name: String
    @Relationship(deleteRule: .cascade) var notes: [Note] = []
    
    init(name: String) {
        self.name = name
    }
}

@Model
final class Note {
    var title: String
    var content: String
    var folder: Folder?
    
    init(title: String, content: String = "", folder: Folder? = nil) {
        self.title = title
        self.content = content
        self.folder = folder
    }
}

// Usage
let folder = Folder(name: "Work")
let note = Note(title: "Meeting notes", folder: folder)
context.insert(folder)
context.insert(note)
```

**Delete rule**: When folder is deleted, all notes are deleted too.

### Many-to-Many (Notes ↔ Tags)

```swift
@Model
final class Tag {
    var name: String
    var notes: [Note] = []
    
    init(name: String) {
        self.name = name
    }
}

@Model
final class Note {
    var title: String
    var tags: [Tag] = []
    
    init(title: String) {
        self.title = title
    }
}

// Usage
let swift = Tag(name: "Swift")
let ios = Tag(name: "iOS")

let note = Note(title: "SwiftUI Tips")
note.tags = [swift, ios]

context.insert(note)
```

## 🎯 Advanced Features

### Computed Properties

```swift
@Model
final class Note {
    var title: String
    var content: String
    var createdAt: Date
    
    @Transient
    var wordCount: Int {
        content.split(separator: " ").count
    }
    
    @Transient
    var isLong: Bool {
        wordCount > 500
    }
}
```

**`@Transient`**: Not saved to database, computed on-the-fly.

### Unique Constraints

```swift
@Model
final class User {
    @Attribute(.unique) var email: String
    var name: String
    
    init(email: String, name: String) {
        self.email = email
        self.name = name
    }
}
```

### Custom Migrations

```swift
enum NotesSchemaV2: VersionedSchema {
    static var versionIdentifier = Schema.Version(2, 0, 0)
    
    static var models: [any PersistentModel.Type] {
        [Note.self, Folder.self]
    }
}

let migrationPlan = SchemaMigrationPlan(
    schemas: [NotesSchemaV1.self, NotesSchemaV2.self],
    stages: [
        MigrationStage.lightweight(fromVersion: NotesSchemaV1.self, toVersion: NotesSchemaV2.self)
    ]
)
```

## 🚀 Performance Tips

### Batch Operations

```swift
func deleteAllNotes() {
    let descriptor = FetchDescriptor<Note>()
    let notes = try? context.fetch(descriptor)
    
    notes?.forEach { context.delete($0) }
    try? context.save()
}
```

### Lazy Loading

```swift
@Model
final class Note {
    var title: String
    
    // Only load when accessed
    @Relationship(deleteRule: .cascade, minimumModelCount: 0)
    var attachments: [Attachment] = []
}
```

### Indexing

```swift
@Model
final class Note {
    @Attribute(.indexed) var createdAt: Date
    var title: String
}
```

## 🧪 Testing with SwiftData

```swift
@Test
func testNoteCreation() throws {
    // Create in-memory container
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try ModelContainer(for: Note.self, configurations: config)
    let context = ModelContext(container)
    
    // Create note
    let note = Note(title: "Test")
    context.insert(note)
    
    // Fetch
    let descriptor = FetchDescriptor<Note>()
    let notes = try context.fetch(descriptor)
    
    #expect(notes.count == 1)
    #expect(notes[0].title == "Test")
}
```

## 💡 Common Patterns

### Undo/Redo

```swift
struct NoteDetailView: View {
    @Environment(\.modelContext) private var context
    @Bindable var note: Note
    
    var body: some View {
        Form {
            TextField("Title", text: $note.title)
        }
        .toolbar {
            Button("Undo") {
                context.undoManager?.undo()
            }
            .disabled(!(context.undoManager?.canUndo ?? false))
        }
    }
}
```

### Batch Updates

```swift
func markAllAsRead() {
    let descriptor = FetchDescriptor<Note>(
        predicate: #Predicate { !$0.isRead }
    )
    
    let unreadNotes = try? context.fetch(descriptor)
    unreadNotes?.forEach { $0.isRead = true }
}
```

### Export Data

```swift
func exportNotes() -> Data? {
    let descriptor = FetchDescriptor<Note>()
    guard let notes = try? context.fetch(descriptor) else {
        return nil
    }
    
    let exportData = notes.map { note in
        [
            "title": note.title,
            "content": note.content,
            "createdAt": note.createdAt.ISO8601Format()
        ]
    }
    
    return try? JSONSerialization.data(withJSONObject: exportData)
}
```

## 🎯 Real App Example

```swift
// Complete notes app with folders
@main
struct NotesApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [Note.self, Folder.self])
    }
}

struct ContentView: View {
    @Query private var folders: [Folder]
    @Environment(\.modelContext) private var context
    
    var body: some View {
        NavigationSplitView {
            // Sidebar
            List(folders) { folder in
                NavigationLink(value: folder) {
                    Label(folder.name, systemImage: "folder")
                }
            }
            .navigationTitle("Folders")
        } detail: { folder in
            // Notes list
            NotesListView(folder: folder)
        }
    }
}
```

## 📚 Resources

- [SwiftData Documentation](https://developer.apple.com/documentation/swiftdata)
- [WWDC23 - Meet SwiftData](https://developer.apple.com/videos/play/wwdc2023/10187/)
- [WWDC23 - Build an app with SwiftData](https://developer.apple.com/videos/play/wwdc2023/10154/)

## 🔗 Next Steps

- [SwiftCharts →](./swiftcharts.md) - Visualize your data
- [CloudKit →](./cloudkit.md) - Sync across devices

---

**Bottom line**: SwiftData = Core Data without the pain. Use it for everything.
