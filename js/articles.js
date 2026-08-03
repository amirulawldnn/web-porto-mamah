/**
 * articles.js — Content Source for Mrs. Sarah Mitchell's Educational Blog
 * =========================================================================
 * This is the single source of truth for all blog article data.
 * To add a new article: copy the article object template below and fill in
 * all fields. The homepage will automatically display it.
 *
 * Schema:
 *   id          — Unique string identifier
 *   title       — Full article title
 *   slug        — URL-friendly identifier (lowercase, hyphens)
 *   coverImage  — Path to the cover image (relative to root)
 *   category    — Display category name (e.g. "Algebra", "Geometry")
 *   catClass    — CSS class for badge color (cat-algebra, cat-geometry, etc.)
 *   author      — Author display name
 *   publishDate — ISO 8601 date string (YYYY-MM-DD)
 *   readingTime — Estimated reading time string
 *   excerpt     — Short 1–2 sentence summary shown in card previews
 *   tags        — Array of tag strings for filtering
 *   featured    — Boolean. Only one article should be featured: true
 *   popular     — Boolean. Mark up to 3 articles as popular sidebar items
 *   latest      — Boolean. Mark articles to appear in the "Latest" column
 *   content     — Full HTML content rendered inside the article reader modal
 */

const ARTICLES = [
  {
    id: 'art-001',
    title: 'The Beauty of Geometry: From 2D Shapes to 3D Spatial Intuition',
    slug: 'beauty-of-geometry-2d-to-3d',
    coverImage: 'images/article_geometry.png',
    category: 'Geometry',
    catClass: 'cat-geometry',
    author: 'Mrs. Sarah Mitchell',
    publishDate: '2026-07-18',
    readingTime: '8 min read',
    excerpt: 'Geometric theorems, Pythagorean relationships, and 3D folding nets empower students to see mathematical symmetry and beauty in the architecture around them.',
    tags: ['Geometry', 'Grade 9', 'Pythagorean Theorem', 'Spatial Reasoning'],
    featured: true,
    popular: false,
    latest: false,
    content: `
      <p>Geometry connects abstract mathematical logic directly to the visible world around us. In Grade 9 geometry, students move from discovering shape properties to formal deductive reasoning and proof.</p>

      <h3>Connecting Nature and Architecture</h3>
      <p>From the Fibonacci spiral in sunflower seeds to the structural integrity of triangular trusses in modern bridges, geometry is everywhere. In my classroom, we start every geometry unit with real-world architectural case studies that make theorems feel alive rather than abstract.</p>

      <h3>Pythagoras Beyond the Formula</h3>
      <p>Rather than simply memorizing <em>a² + b² = c²</em>, students construct physical squares on each side of a right triangle using grid paper. When they cut and rearrange the areas of the two smaller squares to exactly fill the largest square, the theorem becomes unforgettable. Understanding replaces memorization.</p>

      <h3>3D Nets and Spatial Origami</h3>
      <p>Understanding surface area and volume of prisms and pyramids becomes effortless when students unfold 3D solids into flat 2D nets. Origami geometry projects bring spatial reasoning to life and reveal the elegance hidden inside every polyhedron.</p>

      <h3>A Closing Thought</h3>
      <p>Geometry is not merely a branch of mathematics. It is a language for reading the world. Once a student learns to see it, they never stop seeing it—in a spider's web, a honeycomb, a cathedral window, or the screen they are reading these words on.</p>
    `
  },
  {
    id: 'art-002',
    title: 'Demystifying Algebra: Visualizing Unknowns for Grade 8 Students',
    slug: 'demystifying-algebra-visualizing-unknowns',
    coverImage: 'images/article_algebra.png',
    category: 'Algebra',
    catClass: 'cat-algebra',
    author: 'Mrs. Sarah Mitchell',
    publishDate: '2026-08-01',
    readingTime: '6 min read',
    excerpt: 'Transitioning from arithmetic to algebra is a milestone. Five visual balance-scale techniques help students intuitively solve linear equations without fear.',
    tags: ['Algebra', 'Grade 8', 'Linear Equations', 'Visual Learning'],
    featured: false,
    popular: false,
    latest: true,
    content: `
      <p>When middle school students first encounter variables like <em>x</em> and <em>y</em>, algebra can feel like a foreign language. Arithmetic dealt with immediate numbers; algebra requires abstract reasoning about relationships and balanced systems.</p>

      <h3>The Visual Balance Scale</h3>
      <p>Instead of jumping to symbolic manipulation, we start with a balance scale. If two bags of marbles and three single marbles balance eleven single marbles, students visually remove three from both sides. This makes the core algebraic rule—<em>doing the same to both sides</em>—instantly intuitive.</p>

      <h3>Algebra Tiles</h3>
      <p>Physical square and rectangular tiles allow students to manipulate positive and negative terms with their hands. They watch positive tiles cancel negative tiles to form zero pairs, turning an abstract rule into a concrete observation.</p>

      <h3>Real-World Story Problems</h3>
      <p>Framing equations around genuine scenarios—calculating savings goals for a video game, comparing mobile data plans—makes abstract formulas meaningful. When students understand <em>why</em> the equation exists, solving it becomes purposeful.</p>
    `
  },
  {
    id: 'art-003',
    title: 'Mastering Fractions with Visual Sector Diagrams',
    slug: 'mastering-fractions-visual-diagrams',
    coverImage: 'images/article_fractions.png',
    category: 'Fractions',
    catClass: 'cat-fractions',
    author: 'Mrs. Sarah Mitchell',
    publishDate: '2026-07-26',
    readingTime: '5 min read',
    excerpt: 'Fractions do not have to be intimidating. Hands-on sector diagrams and real kitchen measurements build lasting conceptual confidence in Grade 7 students.',
    tags: ['Fractions', 'Grade 7', 'Visual Learning', 'Number Sense'],
    featured: false,
    popular: true,
    latest: true,
    content: `
      <p>Fractions are among the most commonly cited sources of anxiety for Grade 7 students. The solution is not more drill—it is genuine visual understanding that replaces the need to memorize rules that feel arbitrary.</p>

      <h3>Why Fraction Walls Work</h3>
      <p>Comparing 1/3 and 2/5 on a visual fraction strip shows students <em>why</em> common denominators are required before addition or subtraction can happen. Without that visual proof, the shortcut of adding numerators (1/3 + 2/5 = 3/8) remains a persistent and convincing misconception.</p>

      <h3>Kitchen Mathematics</h3>
      <p>We frequently use recipe scaling in class. Doubling or halving baking measurements gives students immediate, delicious practice with improper fractions and mixed numbers. There is no better motivation than curiosity about whether the cookies will turn out right.</p>

      <h3>Beyond Procedure</h3>
      <p>Once students see fractions spatially, operations become consequences of what they understand rather than rules they are obeying. That shift—from compliance to comprehension—is the heart of genuine mathematical confidence.</p>
    `
  },
  {
    id: 'art-004',
    title: 'Data Literacy: Teaching Students to Read and Question Graphs',
    slug: 'data-literacy-reading-questioning-graphs',
    coverImage: 'images/article_statistics.png',
    category: 'Statistics',
    catClass: 'cat-statistics',
    author: 'Mrs. Sarah Mitchell',
    publishDate: '2026-07-10',
    readingTime: '4 min read',
    excerpt: 'Statistical literacy is one of the most vital life skills we can give students. Learning to question graphs critically is just as important as learning to draw them.',
    tags: ['Statistics', 'Grade 8', 'Data Literacy', 'Critical Thinking'],
    featured: false,
    popular: true,
    latest: false,
    content: `
      <p>In our data-saturated digital world, statistical literacy may be the most practical mathematical skill a student can develop. Middle schoolers encounter graphs daily—on social media, in sports coverage, in political reporting—and very few are taught to question what they see.</p>

      <h3>Mean, Median, and Mode in Real Context</h3>
      <p>Using real salary or housing price datasets illustrates why median is often a more honest measure of central tendency than mean when outliers exist. The moment a student realizes the "average" salary in a company can be misleading, something important has shifted in how they see numbers.</p>

      <h3>Spotting Misleading Graphs</h3>
      <p>Students study truncated Y-axes, inconsistent intervals, and cherry-picked time ranges. They become data detectives—looking for what is hidden as much as what is shown. This is one of the most engaged my classes ever become.</p>

      <h3>The Responsibility of the Reader</h3>
      <p>We teach students that the responsibility does not lie solely with the chart's creator. A critical reader of data is an informed citizen. Mathematics, taught this way, is a civic skill.</p>
    `
  },
  {
    id: 'art-005',
    title: '7 Study Habits That Transform Math Exam Performance',
    slug: '7-study-habits-math-exam-performance',
    coverImage: 'images/article_algebra.png',
    category: 'Learning Tips',
    catClass: 'cat-tips',
    author: 'Mrs. Sarah Mitchell',
    publishDate: '2026-06-28',
    readingTime: '7 min read',
    excerpt: 'Effective exam preparation is not about last-minute memorization. These seven habits shift students from anxious reviewing to confident, systematic practice.',
    tags: ['Learning Tips', 'Examinations', 'Study Skills', 'Grade 7', 'Grade 8', 'Grade 9'],
    featured: false,
    popular: true,
    latest: false,
    content: `
      <p>Preparing for mathematics examinations is not about passive memorization. It is about active problem-solving, honest self-reflection, and learning how to manage both time and anxiety effectively.</p>

      <h3>1. Keep an Error Log Notebook</h3>
      <p>When a problem is marked wrong, do not simply erase it. Write down <em>why</em> it was wrong—was it a calculation slip, a sign error, or a conceptual gap?—then redo it step-by-step. This notebook becomes an invaluable personal study guide before every exam.</p>

      <h3>2. Teach It to Someone Else</h3>
      <p>Explaining a concept to a classmate, a parent, or even an imaginary student is the most reliable test of whether you truly understand it. If you cannot explain it simply, you do not yet understand it fully.</p>

      <h3>3. Use 25-Minute Focus Blocks</h3>
      <p>The Pomodoro technique—25 minutes of focused work followed by a 5-minute rest—prevents cognitive fatigue and maintains concentration across longer study sessions. Mathematics requires full attention; these blocks protect it.</p>

      <h3>4. Practice Without Looking at Notes First</h3>
      <p>Begin every practice session by attempting problems from memory. Only check your notes after you have genuinely tried. This retrieval practice builds the memory pathways that activate during an exam.</p>
    `
  },
  {
    id: 'art-006',
    title: 'Math Escape Rooms: Turning Problem-Solving into Play',
    slug: 'math-escape-rooms-problem-solving',
    coverImage: 'images/article_geometry.png',
    category: 'Interactive Learning',
    catClass: 'cat-interactive',
    author: 'Mrs. Sarah Mitchell',
    publishDate: '2026-06-15',
    readingTime: '5 min read',
    excerpt: 'Gamified challenges and classroom escape rooms transform routine algebra drills into collaborative, high-engagement problem-solving experiences students actually look forward to.',
    tags: ['Interactive Learning', 'Grade 7', 'Grade 8', 'Practice Questions', 'Collaboration'],
    featured: false,
    popular: false,
    latest: true,
    content: `
      <p>Gamification does not mean making mathematics easier. It means making the effort feel worthwhile in a different way. When students work together to unlock an escape-room using algebraic clues, the mathematical thinking required is rigorous—but the experience feels like an adventure.</p>

      <h3>How a Math Escape Room Works</h3>
      <p>Students work in small groups. Each correct answer reveals a code or unlocks the next clue. The sequence of problems is designed so that earlier solutions are building blocks for later ones—requiring genuine understanding, not just isolated calculation.</p>

      <h3>What This Teaches Beyond Mathematics</h3>
      <p>Students learn to communicate about mathematical reasoning, to divide problems strategically, and to support one another when someone is stuck. These collaborative skills are as valuable as the algebra itself.</p>

      <h3>Building Your Own</h3>
      <p>A classroom escape room does not require special equipment. A set of envelopes, numbered locks, and a sequence of problems is enough. The design that matters most is in the mathematical structure of the clues—which is, of course, exactly our area of expertise.</p>
    `
  }
];
