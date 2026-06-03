"""
pacmen_solver.py
================

Reusable solver library for the n-pacmen convergence problem.

The problem:
    Given a 2D grid maze (0 = empty, 1 = wall) and n pacmen placed on
    free cells, find a sequence of simultaneous moves that gathers all
    n pacmen onto the same cell in the minimum number of time units.
    At each time unit, every pacman either stays still or moves one
    cell up / down / left / right (no diagonal moves). Multiple
    pacmen may share a cell at any time.

What this module gives you:
    - The State class: the canonical representation of a system state.
    - The PacmenProblem class: instantiate it once with a grid; it
      precomputes the per-cell neighbour table for that maze and lets
      you run A* and DFS as many times as you want with different
      starting configurations.

Typical usage:

    from pacmen_solver import PacmenProblem

    problem = PacmenProblem(my_grid)
    path, expanded = problem.a_star([(1, 1), (3, 5), (4, 2)])
    print("optimal path length:", len(path) - 1)

The library is independent of any specific maze: it works for any
connected (or even disconnected) grid you give it.
"""

import heapq
import random
from itertools import product


# Five possible actions per pacman: 4 cardinal directions + stay still.
# This matches the original problem statement ("a pacman can stop") and the
# 5^n branching factor used in question Q3.
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1), (0, 0)]


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
class State:
    """
    Represents one full system state during the search.

    Attributes:
        positions : tuple of (x, y) tuples, one per pacman
        g         : cost-so-far from the start state (number of time units)
        h         : heuristic estimate of remaining cost to the goal
        f         : g + h, the total cost A* uses to order states
        parent    : pointer to the previous State in the search path,
                    used to reconstruct the path once the goal is reached

    The class is hashable on its `positions` tuple so it can be stored in
    sets and used as a dict key. `__lt__` is defined so heapq can order
    states by f when they happen to be pushed directly onto the heap.
    """

    __slots__ = ("positions", "g", "h", "f", "parent")

    def __init__(self, positions, g=0, h=0.0, parent=None):
        self.positions = positions
        self.g = g
        self.h = h
        self.f = g + h
        self.parent = parent

    def __lt__(self, other):
        return self.f < other.f

    def __eq__(self, other):
        return isinstance(other, State) and self.positions == other.positions

    def __hash__(self):
        return hash(self.positions)


class _NodeBudgetExceeded(Exception):
    """Raised inside DFS to unwind the call stack when max_nodes is hit."""
    pass


# ---------------------------------------------------------------------------
# PacmenProblem
# ---------------------------------------------------------------------------
class PacmenProblem:
    """
    A pacmen convergence problem instance defined by a maze.

    Construct it once with a grid and reuse it: the per-cell neighbour
    table is precomputed in __init__, so calling a_star() or dfs()
    repeatedly on the same maze with different starting positions
    is fast.
    """

    def __init__(self, grid):
        """
        Initialize the problem from a grid.

        What it does:
            Stores the grid, computes the list of free cells, and
            precomputes for every free cell the tuple of cells reachable
            in one time-unit (the cell itself plus its four cardinal
            neighbours, walls and out-of-bounds excluded). This neighbour
            table is the main reason the search is fast: the inner loops
            never re-check walls.

        Args:
            grid : 2D list of 0/1 (rows of equal length).
                   0 = free cell, 1 = wall.
        """
        self.grid = grid
        self.rows = len(grid)
        self.cols = len(grid[0]) if grid else 0
        self.free_cells = [
            (r, c)
            for r in range(self.rows)
            for c in range(self.cols)
            if grid[r][c] == 0
        ]
        self._neighbors_of = self._precompute_neighbors()

    # -------------------------------------------------------------------
    # Setup helpers
    # -------------------------------------------------------------------
    def _is_valid(self, x, y):
        """
        Tells whether (x, y) is a legal pacman position.

        A position is valid when it lies inside the grid bounds and the
        corresponding cell is not a wall (grid value 0). Used only while
        building the neighbour table; the search loops do not call it.
        """
        return (
            0 <= x < self.rows
            and 0 <= y < self.cols
            and self.grid[x][y] == 0
        )

    def _precompute_neighbors(self):
        """
        Build the lookup table {cell -> tuple of valid next-cells}.

        Called once at construction time. For every free cell of the
        grid we collect the cells where a pacman could be one time-unit
        later (up / down / left / right / stay), filtering out walls and
        out-of-bounds moves. The resulting table is consulted by every
        successor-generation step of A* and DFS.
        """
        table = {}
        for r in range(self.rows):
            for c in range(self.cols):
                if self.grid[r][c] == 0:
                    options = []
                    for dr, dc in MOVES:
                        nr, nc = r + dr, c + dc
                        if self._is_valid(nr, nc):
                            options.append((nr, nc))
                    table[(r, c)] = tuple(options)
        return table

    # -------------------------------------------------------------------
    # Core problem operations
    # -------------------------------------------------------------------
    def is_goal(self, positions):
        """
        Goal test: returns True iff all pacmen are on the same cell.

        We do a single pass over the positions tuple and bail out as
        soon as we find a position different from the first one. This
        is faster than building a set on every call, especially in the
        hot inner loops of A* and DFS.
        """
        first = positions[0]
        for p in positions:
            if p != first:
                return False
        return True

    def heuristic(self, positions):
        """
        The admissible heuristic from question Q5b:

            h = (1/2) * max( max x-spread , max y-spread )

        Why it is admissible:
            In a maze without walls, look at the x axis only: the two
            pacmen most spread on x must close that gap, and since both
            can move at most one cell per time unit the gap shrinks by
            at most 2 per step. So at least Δx/2 steps are needed. The
            same reasoning on the y axis gives at least Δy/2 steps. The
            true cost must be at least both, hence at least their max.
            Adding walls can only make the real cost equal or larger,
            never smaller, so h is a lower bound on the true cost.

        Implementation note:
            We compute xmin, xmax, ymin, ymax in a single pass over the
            positions tuple, avoiding the two list comprehensions a
            naive version would use.
        """
        xmin = xmax = positions[0][0]
        ymin = ymax = positions[0][1]
        for x, y in positions:
            if x < xmin: xmin = x
            elif x > xmax: xmax = x
            if y < ymin: ymin = y
            elif y > ymax: ymax = y
        dx = xmax - xmin
        dy = ymax - ymin
        return 0.5 * (dx if dx > dy else dy)

    def gen_neighbors(self, state):
        """
        Generate all successor States of a given State.

        How it works:
            Each pacman has up to 5 valid next-cells (looked up from the
            precomputed neighbour table). The set of successor states
            is the cartesian product of those individual choices. For
            each combination we build a new State with g incremented by
            one, the heuristic recomputed, and a parent pointer back
            to the input state so the path can be reconstructed later.

        Note for performance:
            The search functions a_star() and dfs() do NOT call this
            method in their hot loops; they iterate directly over raw
            position tuples to avoid creating one State object per
            generated successor. gen_neighbors is provided as the public
            API required by the project specification, and it returns
            full State objects so external callers can use them
            naturally.
        """
        per_pacman = [self._neighbors_of[p] for p in state.positions]
        out = []
        for combo in product(*per_pacman):
            ns = State(positions=combo, g=state.g + 1, parent=state)
            ns.h = self.heuristic(combo)
            ns.f = ns.g + ns.h
            out.append(ns)
        return out

    # -------------------------------------------------------------------
    # Path reconstruction
    # -------------------------------------------------------------------
    def _reconstruct_path(self, parents, end):
        """
        Walk a {positions -> parent_positions} dict backwards from the
        goal to the start, then reverse, returning the list of
        positions visited along the path.

        Used by both a_star() and dfs() to turn their search-time
        bookkeeping into a clean output path.
        """
        path = []
        cur = end
        while cur is not None:
            path.append(cur)
            cur = parents[cur]
        path.reverse()
        return path

    # -------------------------------------------------------------------
    # A*
    # -------------------------------------------------------------------
    def a_star(self, start_positions):
        """
        Solve the problem with the A* algorithm using a heap-based
        priority queue (Python's heapq).

        Algorithm (Q6):
            - Maintain an open heap of states ordered by f = g + h.
            - Maintain a closed set of states already finalized, and a
              best_g dictionary recording the lowest g found so far for
              each known state.
            - On every iteration pop the state with the lowest f. If
              it is already in closed, it is a stale duplicate from an
              earlier push, so skip it. If it is the goal, reconstruct
              and return the path. Otherwise, expand it: for each of
              its successors, push only if we found a strictly better
              path to it (this keeps the heap small).

        Optimality:
            Because self.heuristic() is admissible (proven in Q5b),
            A* is guaranteed to return a path of optimal length, i.e.
            the minimum number of time units to converge.

        Args:
            start_positions : iterable of n (x, y) positions, one per pacman.

        Returns:
            (path, expanded) where
                path     = list of position tuples from start to goal,
                           or None if no path exists.
                expanded = number of states actually expanded (popped and
                           processed). Useful for benchmarking the
                           pruning effectiveness of the heuristic.
        """
        start = tuple(start_positions)
        h0 = self.heuristic(start)

        # `counter` is a strictly increasing tie-breaker so heapq never
        # has to compare position tuples when two states share the same
        # f-value.
        counter = 0
        open_heap = [(h0, counter, 0, start)]
        parents = {start: None}
        best_g = {start: 0}
        closed = set()
        expanded = 0

        while open_heap:
            f, _, g, pos = heapq.heappop(open_heap)

            if pos in closed:
                continue

            if self.is_goal(pos):
                return self._reconstruct_path(parents, pos), expanded

            closed.add(pos)
            expanded += 1

            per_pacman = [self._neighbors_of[p] for p in pos]
            ng = g + 1
            for combo in product(*per_pacman):
                if combo in closed:
                    continue
                if ng < best_g.get(combo, 1 << 30):
                    best_g[combo] = ng
                    parents[combo] = pos
                    nh = self.heuristic(combo)
                    counter += 1
                    heapq.heappush(open_heap, (ng + nh, counter, ng, combo))

        return None, expanded

    # -------------------------------------------------------------------
    # DFS
    # -------------------------------------------------------------------
    def dfs(self, start_positions, max_depth=40, max_nodes=400_000):
        """
        Solve the problem with a recursive depth-first search.

        Plain DFS has no admissible-heuristic pruning, and the branching
        factor here is 5^n, so on non-trivial mazes DFS can wander an
        enormous slice of the state space before stumbling onto a goal.
        To keep the function from running indefinitely we add two
        defensive caps:

            max_depth : the recursion does not explore beyond this depth.
                        Note: this is a practical floor, not a
                        theoretical bound — the worst-case height from
                        Q4 is M/2, but on any realistic maze the node
                        cap binds long before we ever get that deep.
            max_nodes : total number of states the recursion may touch
                        before giving up. Implemented via an exception
                        so the entire call stack unwinds quickly.

        Guarantees:
            DFS finds *a* path if one exists within the budget; it does
            NOT guarantee optimality. The path it returns is typically
            much longer than what A* would find for the same instance.

        Returns:
            (path, visited) where
                path    = list of position tuples, or None if no
                          solution was found within the budget.
                visited = number of recursion calls made (i.e. states
                          examined, including the start and the goal).
        """
        start = tuple(start_positions)
        visited = set()
        parents = {start: None}
        stats = {"visited": 0}

        def rec(pos, depth):
            stats["visited"] += 1
            if stats["visited"] > max_nodes:
                raise _NodeBudgetExceeded
            if self.is_goal(pos):
                return self._reconstruct_path(parents, pos)
            if depth >= max_depth:
                return None
            visited.add(pos)
            per_pacman = [self._neighbors_of[p] for p in pos]
            for combo in product(*per_pacman):
                if combo in visited:
                    continue
                # The visited check above ensures parents[combo] is set
                # at most once, so no `not in parents` guard is needed.
                parents[combo] = pos
                result = rec(combo, depth + 1)
                if result is not None:
                    return result
            return None

        try:
            path = rec(start, 0)
        except _NodeBudgetExceeded:
            path = None
        return path, stats["visited"]

    # -------------------------------------------------------------------
    # Convenience
    # -------------------------------------------------------------------
    def random_positions(self, n, rng=None):
        """
        Pick n random positions on the maze with replacement.

        Pacmen are allowed to share cells, so we sample with replacement
        from the precomputed list of free cells.

        Args:
            n   : number of pacmen to place.
            rng : optional random.Random instance. Pass your own if you
                  want reproducible benchmarks; defaults to the module
                  random (which is also seeded by random.seed(...)).
        """
        rnd = rng if rng is not None else random
        return [rnd.choice(self.free_cells) for _ in range(n)]
