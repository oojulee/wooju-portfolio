/**
 * INFINITY — Book page-flip controller
 *
 * Leaf → page mapping:
 *   Leaf 0  front: p1 (cover)    back: p2
 *   Leaf 1  front: p3            back: p4
 *   Leaf 2  front: p5            back: p6
 *   Leaf 3  front: p7            back: p8
 *   Leaf 4  front: p9            back: p10
 *   Leaf 5  front: p11           back: p12
 *   Leaf 6  front: p13           back: p14
 *   Leaf 7  front: p15           back: p16 (back cover)
 *
 * Z-index rules:
 *   Unflipped (right side): leaf 0 = z:8 … leaf 7 = z:1
 *   Flipped   (left  side): leaf 0 = z:1 … leaf 7 = z:8  (latest flip on top)
 *   Animating             : z:50  (above all siblings)
 *
 * Masks:
 *   bookLeftMask  visible when currentLeaf === 0           (front-cover state)
 *   bookRightMask visible when currentLeaf === NUM_LEAVES  (back-cover state)
 *
 * Hover zones:
 *   hoverLeft  disabled when currentLeaf === 0            (nothing to go back to)
 *   hoverRight disabled when currentLeaf === NUM_LEAVES   (nothing to go forward to)
 *   Hovering for HOVER_DELAY ms triggers a flip.
 *   Clicking triggers an immediate flip.
 */

(function () {
  'use strict';

  const NUM_LEAVES  = 8;
  const FLIP_MS     = 750;    // must match CSS transition duration
  const HOVER_DELAY = 380;    // ms of hover before auto-flip triggers

  const PAGE_LABELS = [
    'Cover',
    'Pages 2 – 3',
    'Pages 4 – 5',
    'Pages 6 – 7',
    'Pages 8 – 9',
    'Pages 10 – 11',
    'Pages 12 – 13',
    'Pages 14 – 15',
    'Back Cover',
  ];

  /* ── DOM ─────────────────────────────────────────────── */
  const book       = document.getElementById('book');
  const bookScene  = book.closest('.book-scene');
  const hoverLeft  = document.getElementById('hoverLeft');
  const hoverRight = document.getElementById('hoverRight');
  const prevBtn    = document.getElementById('prevBtn');
  const nextBtn    = document.getElementById('nextBtn');
  const pageInfo   = document.getElementById('pageInfo');
  const hint       = document.querySelector('.book-hint');

  /* ── State ───────────────────────────────────────────── */
  let currentLeaf = 0;    // next leaf index to flip (0–8; 8 = all flipped)
  let animating   = false;
  let hoverTimer  = null;

  /* ── Helpers ─────────────────────────────────────────── */
  function getLeaf(i) {
    return book.querySelector(`.page[data-leaf="${i}"]`);
  }
  function unflippedZ(i) { return NUM_LEAVES - i; }  // leaf 0→8, leaf 7→1
  function flippedZ(i)   { return i + 1; }            // leaf 0→1, leaf 7→8

  /* ── Flip forward ────────────────────────────────────── */
  function flipForward() {
    if (animating || currentLeaf >= NUM_LEAVES) return;
    animating = true;
    hideHint();

    const leafIdx = currentLeaf;
    const leaf    = getLeaf(leafIdx);

    // Leaving front-cover: hold the book completely still until the leaf
    // crosses the spine (~500 ms), then snap the clip off and start the
    // centering transition in one step — no shadow creep during the flip.
    if (leafIdx === 0) {
      setTimeout(() => {
        bookScene.classList.remove('cover-clip-l');
        bookScene.classList.remove('cover-pos-l');
      }, FLIP_MS / 2);
    }

    leaf.style.zIndex = 50;
    leaf.classList.add('flipped');
    currentLeaf++;

    // Entering back-cover: add clip once the leaf crosses the spine,
    // then start the centering transition on the next frame.
    if (currentLeaf === NUM_LEAVES) {
      setTimeout(() => {
        bookScene.classList.add('cover-clip-r');
        requestAnimationFrame(() => bookScene.classList.add('cover-pos-r'));
      }, FLIP_MS / 2);
    }

    updateUI();

    setTimeout(() => {
      leaf.style.zIndex = flippedZ(leafIdx);
      animating = false;
    }, FLIP_MS);
  }

  /* ── Flip backward ───────────────────────────────────── */
  function flipBackward() {
    if (animating || currentLeaf <= 0) return;
    animating = true;

    const wasBackCover = (currentLeaf === NUM_LEAVES);

    currentLeaf--;
    const leafIdx = currentLeaf;
    const leaf    = getLeaf(leafIdx);

    // Leaving back-cover: same strategy — hold still, then at spine-crossing
    // snap clip off and start centering together.
    if (wasBackCover) {
      setTimeout(() => {
        bookScene.classList.remove('cover-clip-r');
        bookScene.classList.remove('cover-pos-r');
      }, FLIP_MS / 2);
    }

    // Returning to front-cover: clip the left half the moment the cover leaf
    // crosses the spine (500 ms), so the empty left side never shows.
    if (leafIdx === 0) {
      setTimeout(() => bookScene.classList.add('cover-clip-l'), FLIP_MS / 2);
    }

    leaf.style.zIndex = 50;
    leaf.classList.remove('flipped');
    updateUI();

    setTimeout(() => {
      leaf.style.zIndex = unflippedZ(leafIdx);
      animating = false;

      // Cover leaf has fully landed on the right; clip is already in place —
      // now start the centering transition.
      if (currentLeaf === 0) {
        requestAnimationFrame(() => bookScene.classList.add('cover-pos-l'));
      }
    }, FLIP_MS);
  }

  /* ── UI sync ─────────────────────────────────────────── */
  function updateUI() {
    pageInfo.textContent = PAGE_LABELS[currentLeaf];
    prevBtn.disabled     = currentLeaf === 0;
    nextBtn.disabled     = currentLeaf === NUM_LEAVES;
    hoverLeft.classList.toggle('disabled',  currentLeaf === 0);
    hoverRight.classList.toggle('disabled', currentLeaf === NUM_LEAVES);
  }

  function hideHint() {
    if (hint) hint.classList.add('faded');
  }

  /* ── Init ────────────────────────────────────────────── */
  function init() {
    for (let i = 0; i < NUM_LEAVES; i++) {
      getLeaf(i).style.zIndex = unflippedZ(i);
    }
    updateUI();
  }

  /* ── Event listeners ─────────────────────────────────── */

  // Prev / Next buttons
  prevBtn.addEventListener('click', flipBackward);
  nextBtn.addEventListener('click', flipForward);

  // Keyboard arrows
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') flipForward();
    if (e.key === 'ArrowLeft')  flipBackward();
  });

  // Hover zones — immediate click + delayed auto-flip on hover
  function attachHoverZone(el, action) {
    el.addEventListener('click', action);
    el.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(action, HOVER_DELAY);
    });
    el.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
    });
  }
  attachHoverZone(hoverRight, flipForward);
  attachHoverZone(hoverLeft,  flipBackward);

  // Touch swipe on the book
  let touchStartX = 0;
  book.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  book.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) flipForward();
      else        flipBackward();
    }
  }, { passive: true });

  /* ── Boot ────────────────────────────────────────────── */
  init();

})();
