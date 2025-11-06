// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="introduction.html">Introduction</a></li><li class="chapter-item expanded affix "><li class="part-title">Performance Mastery</li><li class="chapter-item expanded "><a href="performance/launch-optimization.html"><strong aria-hidden="true">1.</strong> Launch Time Optimization</a></li><li class="chapter-item expanded "><a href="performance/memory-optimization.html"><strong aria-hidden="true">2.</strong> Memory Management</a></li><li class="chapter-item expanded "><a href="performance/battery-optimization.html"><strong aria-hidden="true">3.</strong> Battery Efficiency</a></li><li class="chapter-item expanded "><a href="performance/network-optimization.html"><strong aria-hidden="true">4.</strong> Network Performance</a></li><li class="chapter-item expanded affix "><li class="part-title">Monetization Engineering</li><li class="chapter-item expanded "><a href="monetization/paywall-psychology.html"><strong aria-hidden="true">5.</strong> Paywall Psychology</a></li><li class="chapter-item expanded "><a href="monetization/subscription-retention.html"><strong aria-hidden="true">6.</strong> Subscription Retention</a></li><li class="chapter-item expanded "><a href="monetization/ab-testing.html"><strong aria-hidden="true">7.</strong> A/B Testing Framework</a></li><li class="chapter-item expanded "><a href="monetization/revenue-analytics.html"><strong aria-hidden="true">8.</strong> Revenue Analytics</a></li><li class="chapter-item expanded affix "><li class="part-title">Scale Architecture</li><li class="chapter-item expanded "><a href="scale/data-architecture.html"><strong aria-hidden="true">9.</strong> Data Architecture</a></li><li class="chapter-item expanded "><a href="scale/caching-strategies.html"><strong aria-hidden="true">10.</strong> Caching Strategies</a></li><li class="chapter-item expanded "><a href="scale/background-processing.html"><strong aria-hidden="true">11.</strong> Background Processing</a></li><li class="chapter-item expanded "><a href="scale/api-design.html"><strong aria-hidden="true">12.</strong> API Design</a></li><li class="chapter-item expanded affix "><li class="part-title">App Store Mastery</li><li class="chapter-item expanded "><a href="app-store/aso-optimization.html"><strong aria-hidden="true">13.</strong> ASO Optimization</a></li><li class="chapter-item expanded "><a href="app-store/feature-strategy.html"><strong aria-hidden="true">14.</strong> Feature Strategy</a></li><li class="chapter-item expanded "><a href="app-store/review-management.html"><strong aria-hidden="true">15.</strong> Review Management</a></li><li class="chapter-item expanded "><a href="app-store/launch-strategy.html"><strong aria-hidden="true">16.</strong> Launch Strategy</a></li><li class="chapter-item expanded affix "><li class="part-title">Production Swift</li><li class="chapter-item expanded "><a href="swift/concurrency-patterns.html"><strong aria-hidden="true">17.</strong> Swift 6 Concurrency</a></li><li class="chapter-item expanded "><a href="swift/swiftui-performance.html"><strong aria-hidden="true">18.</strong> SwiftUI Performance</a></li><li class="chapter-item expanded "><a href="swift/error-handling.html"><strong aria-hidden="true">19.</strong> Error Handling</a></li><li class="chapter-item expanded "><a href="swift/testing-strategies.html"><strong aria-hidden="true">20.</strong> Testing Strategies</a></li><li class="chapter-item expanded affix "><li class="part-title">Real-World Projects</li><li class="chapter-item expanded "><a href="projects/photo-editor.html"><strong aria-hidden="true">21.</strong> Photo Editor App</a></li><li class="chapter-item expanded "><a href="projects/news-app.html"><strong aria-hidden="true">22.</strong> Subscription News App</a></li><li class="chapter-item expanded "><a href="projects/social-app.html"><strong aria-hidden="true">23.</strong> Social Media App</a></li><li class="chapter-item expanded "><a href="projects/productivity-app.html"><strong aria-hidden="true">24.</strong> Productivity App</a></li><li class="chapter-item expanded affix "><li class="part-title">Advanced Topics</li><li class="chapter-item expanded "><a href="advanced/security.html"><strong aria-hidden="true">25.</strong> Security Implementation</a></li><li class="chapter-item expanded "><a href="advanced/accessibility.html"><strong aria-hidden="true">26.</strong> Accessibility Excellence</a></li><li class="chapter-item expanded "><a href="advanced/internationalization.html"><strong aria-hidden="true">27.</strong> Internationalization</a></li><li class="chapter-item expanded "><a href="advanced/analytics.html"><strong aria-hidden="true">28.</strong> Analytics &amp; Monitoring</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
