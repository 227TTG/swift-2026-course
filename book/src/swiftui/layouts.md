# Advanced Layouts

> **Build a real Instagram-style feed from scratch**

## 🎯 What You'll Build

A production-ready social media feed with:
- ✅ Infinite scroll
- ✅ Pull-to-refresh
- ✅ Image caching
- ✅ Smooth animations
- ✅ Memory efficient

**Time**: 30 minutes | **Level**: Intermediate

## 🚀 Step 1: Data Model

```swift
import Foundation

struct Post: Identifiable {
    let id = UUID()
    let username: String
    let userAvatar: String
    let imageURL: String
    let caption: String
    let likes: Int
    let timestamp: Date
}

// Sample data for testing
extension Post {
    static let samples = [
        Post(
            username: "detroit_dev",
            userAvatar: "person.circle.fill",
            imageURL: "photo1",
            caption: "Building with SwiftUI 🚀",
            likes: 234,
            timestamp: Date().addingTimeInterval(-3600)
        ),
        Post(
            username: "swift_creator",
            userAvatar: "person.circle.fill",
            imageURL: "photo2",
            caption: "New app launch today!",
            likes: 567,
            timestamp: Date().addingTimeInterval(-7200)
        )
    ]
}
```

**Why this matters**: Real apps need sample data for development. This pattern lets you test without a backend.

## 📱 Step 2: Post Card Component

```swift
struct PostCard: View {
    let post: Post
    @State private var isLiked = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            header
            
            // Image
            postImage
            
            // Actions
            actionBar
            
            // Caption
            caption
        }
    }
    
    private var header: some View {
        HStack {
            Image(systemName: post.userAvatar)
                .resizable()
                .frame(width: 32, height: 32)
                .clipShape(Circle())
            
            Text(post.username)
                .font(.subheadline)
                .fontWeight(.semibold)
            
            Spacer()
            
            Button {
                // More options
            } label: {
                Image(systemName: "ellipsis")
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
    
    private var postImage: some View {
        AsyncImage(url: URL(string: post.imageURL)) { phase in
            switch phase {
            case .empty:
                ProgressView()
                    .frame(height: 400)
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 400)
                    .clipped()
            case .failure:
                Color.gray
                    .frame(height: 400)
            @unknown default:
                EmptyView()
            }
        }
    }
    
    private var actionBar: some View {
        HStack(spacing: 16) {
            Button {
                withAnimation(.spring(response: 0.3)) {
                    isLiked.toggle()
                }
            } label: {
                Image(systemName: isLiked ? "heart.fill" : "heart")
                    .foregroundStyle(isLiked ? .red : .primary)
                    .font(.title2)
            }
            
            Button {
                // Comment
            } label: {
                Image(systemName: "bubble.right")
                    .font(.title2)
            }
            
            Button {
                // Share
            } label: {
                Image(systemName: "paperplane")
                    .font(.title2)
            }
            
            Spacer()
            
            Button {
                // Bookmark
            } label: {
                Image(systemName: "bookmark")
                    .font(.title2)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
    
    private var caption: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(post.likes) likes")
                .font(.subheadline)
                .fontWeight(.semibold)
            
            Text(post.username)
                .font(.subheadline)
                .fontWeight(.semibold)
            + Text(" \(post.caption)")
                .font(.subheadline)
            
            Text(post.timestamp, style: .relative)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }
}
```

**Key Learning**: Component composition. Each section is a computed property for clarity.

## 🔄 Step 3: Feed View with Infinite Scroll

```swift
@Observable
class FeedViewModel {
    var posts: [Post] = []
    var isLoading = false
    
    func loadInitialPosts() async {
        isLoading = true
        // Simulate network delay
        try? await Task.sleep(for: .seconds(1))
        posts = Post.samples
        isLoading = false
    }
    
    func loadMorePosts() async {
        guard !isLoading else { return }
        isLoading = true
        
        // Simulate loading more
        try? await Task.sleep(for: .seconds(1))
        posts.append(contentsOf: Post.samples)
        isLoading = false
    }
}

struct FeedView: View {
    @State private var viewModel = FeedViewModel()
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(viewModel.posts) { post in
                    PostCard(post: post)
                        .onAppear {
                            // Load more when reaching last item
                            if post.id == viewModel.posts.last?.id {
                                Task {
                                    await viewModel.loadMorePosts()
                                }
                            }
                        }
                }
                
                if viewModel.isLoading {
                    ProgressView()
                        .padding()
                }
            }
        }
        .refreshable {
            await viewModel.loadInitialPosts()
        }
        .task {
            await viewModel.loadInitialPosts()
        }
    }
}
```

**Why this works**: 
- `LazyVStack` only loads visible views (memory efficient)
- `onAppear` triggers pagination
- `refreshable` adds pull-to-refresh
- `@Observable` eliminates boilerplate

## 🎨 Step 4: Add Smooth Animations

```swift
struct AnimatedPostCard: View {
    let post: Post
    @State private var isLiked = false
    @State private var likeScale: CGFloat = 1.0
    
    var body: some View {
        PostCard(post: post)
            .scaleEffect(likeScale)
            .onTapGesture(count: 2) {
                // Double tap to like
                isLiked = true
                
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    likeScale = 1.2
                }
                
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6).delay(0.1)) {
                    likeScale = 1.0
                }
            }
    }
}
```

**Pro tip**: Spring animations feel natural. Use `dampingFraction` < 1 for bounce.

## 🚀 Step 5: Performance Optimization

```swift
struct OptimizedFeedView: View {
    @State private var viewModel = FeedViewModel()
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(viewModel.posts) { post in
                    PostCard(post: post)
                        .id(post.id) // Explicit identity
                        .equatable() // Skip redraw if unchanged
                        .onAppear {
                            loadMoreIfNeeded(post: post)
                        }
                }
            }
        }
    }
    
    private func loadMoreIfNeeded(post: Post) {
        // Only load when 3 items from end
        guard let index = viewModel.posts.firstIndex(where: { $0.id == post.id }),
              index >= viewModel.posts.count - 3 else {
            return
        }
        
        Task {
            await viewModel.loadMorePosts()
        }
    }
}
```

**Performance wins**:
- `.equatable()` prevents unnecessary redraws
- Load 3 items before end (smoother UX)
- `LazyVStack` defers view creation

## 🎯 Challenge: Add These Features

### 1. Image Caching (15 min)

```swift
actor ImageCache {
    private var cache: [URL: UIImage] = [:]
    
    func image(for url: URL) -> UIImage? {
        cache[url]
    }
    
    func store(_ image: UIImage, for url: URL) {
        cache[url] = image
    }
}

// Use in AsyncImage
```

### 2. Skeleton Loading (10 min)

```swift
struct SkeletonView: View {
    @State private var isAnimating = false
    
    var body: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(.gray.opacity(0.3))
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .fill(
                        LinearGradient(
                            colors: [.clear, .white.opacity(0.5), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .offset(x: isAnimating ? 400 : -400)
            }
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    isAnimating = true
                }
            }
    }
}
```

### 3. Like Animation (5 min)

```swift
// Add heart explosion when double-tapping
struct HeartExplosion: View {
    @State private var scale: CGFloat = 0
    @State private var opacity: Double = 1
    
    var body: some View {
        Image(systemName: "heart.fill")
            .font(.system(size: 100))
            .foregroundStyle(.red)
            .scaleEffect(scale)
            .opacity(opacity)
            .onAppear {
                withAnimation(.spring(response: 0.5)) {
                    scale = 1.5
                    opacity = 0
                }
            }
    }
}
```

## 📊 What You Learned

✅ **Layout Composition**: Breaking UI into reusable components  
✅ **Lazy Loading**: Memory-efficient lists with `LazyVStack`  
✅ **Async Operations**: Loading data with `async/await`  
✅ **Animations**: Spring animations for natural feel  
✅ **Performance**: `.equatable()` and smart pagination  
✅ **State Management**: `@Observable` for clean code  

## 🎓 Next Steps

1. **Add Backend**: Connect to real API
2. **Add Comments**: Build comment thread view
3. **Add Stories**: Horizontal scrolling stories
4. **Add Search**: Search users and hashtags

## 💡 Real-World Tips

**From Production Apps**:
- Always use `LazyVStack` for feeds (Instagram, Twitter do this)
- Prefetch 3-5 items ahead for smooth scrolling
- Cache images aggressively (saves bandwidth)
- Use skeleton screens (better UX than spinners)
- Spring animations > linear (feels more natural)

## 🔗 Complete Project

```swift
// Full working example you can copy-paste
import SwiftUI

@main
struct FeedApp: App {
    var body: some Scene {
        WindowGroup {
            FeedView()
        }
    }
}

// Add all the code above and run!
```

**Try it now**: Copy this into Xcode and run. You'll have a working feed in 2 minutes.

---

**Next**: [Animations & Transitions →](./animations.md) - Build a card swipe interface like Tinder
