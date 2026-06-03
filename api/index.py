import os
import sys
import time
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS

# Ensure parent directory is in path so we can import pacmen_solver.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from pacmen_solver import PacmenProblem
except ImportError:
    # If imports fail due to directory context, look locally
    from pacmen_solver import PacmenProblem

app = Flask(__name__)
# Enable CORS for easy cross-origin development (local + cloud)
CORS(app)

@app.route('/api/solve', methods=['POST'])
def api_solve():
    """
    Solves a given Pacman maze instance with either A* or DFS.
    Expects JSON:
    {
      "grid": [[1,1,1], [1,0,1], [1,1,1]],
      "pacmen": [[r1, c1], [r2, c2], ...],
      "algorithm": "a_star" | "dfs"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        grid = data.get("grid")
        pacmen_list = data.get("pacmen")
        algorithm = data.get("algorithm", "a_star")

        if not grid or not pacmen_list:
            return jsonify({"success": False, "error": "Missing grid or pacmen list"}), 400

        # Validate pacmen count (up to 5)
        if len(pacmen_list) < 1 or len(pacmen_list) > 5:
            return jsonify({"success": False, "error": "Number of Pac-Men must be between 1 and 5"}), 400

        # Convert pacmen positions to tuple of tuples
        pacmen_start = tuple(tuple(pos) for pos in pacmen_list)

        # Create problem instance
        problem = PacmenProblem(grid)

        # Solve based on algorithm selection
        t0 = time.perf_counter()
        if algorithm == "a_star":
            path, expanded = problem.a_star(pacmen_start)
            dt_ms = (time.perf_counter() - t0) * 1000
            nodes_name = "expanded"
        elif algorithm == "dfs":
            # Defensive caps from the project report
            path, expanded = problem.dfs(pacmen_start, max_depth=40, max_nodes=400000)
            dt_ms = (time.perf_counter() - t0) * 1000
            nodes_name = "visited"
        else:
            return jsonify({"success": False, "error": f"Invalid algorithm '{algorithm}'"}), 400

        # Format output path for easy frontend rendering
        serialized_path = None
        if path is not None:
            serialized_path = [[list(pos) for pos in step] for step in path]

        return jsonify({
            "success": True,
            "path": serialized_path,
            "nodes_count": expanded,
            "nodes_metric": nodes_name,
            "time_ms": dt_ms,
            "steps": len(path) - 1 if path else -1
        })

    except Exception as e:
        print(f"Error in /api/solve: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/compare', methods=['POST'])
def api_compare():
    """
    Executes BOTH A* and DFS on the exact same starting configuration and maze,
    returning a side-by-side comparison payload.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        grid = data.get("grid")
        pacmen_list = data.get("pacmen")

        if not grid or not pacmen_list:
            return jsonify({"success": False, "error": "Missing grid or pacmen list"}), 400

        if len(pacmen_list) < 1 or len(pacmen_list) > 5:
            return jsonify({"success": False, "error": "Number of Pac-Men must be between 1 and 5"}), 400

        pacmen_start = tuple(tuple(pos) for pos in pacmen_list)
        problem = PacmenProblem(grid)

        # Run A*
        t0 = time.perf_counter()
        path_a, exp_a = problem.a_star(pacmen_start)
        t_a_ms = (time.perf_counter() - t0) * 1000

        # Run DFS (depth=40, nodes=400000 cap per project parameters)
        t0 = time.perf_counter()
        path_d, vis_d = problem.dfs(pacmen_start, max_depth=40, max_nodes=400000)
        t_d_ms = (time.perf_counter() - t0) * 1000

        # Serialize results
        serialized_path_a = [[list(pos) for pos in step] for step in path_a] if path_a else None
        serialized_path_d = [[list(pos) for pos in step] for step in path_d] if path_d else None

        return jsonify({
            "success": True,
            "a_star": {
                "path": serialized_path_a,
                "nodes_count": exp_a,
                "time_ms": t_a_ms,
                "steps": len(path_a) - 1 if path_a else -1,
                "found": path_a is not None
            },
            "dfs": {
                "path": serialized_path_d,
                "nodes_count": vis_d,
                "time_ms": t_d_ms,
                "steps": len(path_d) - 1 if path_d else -1,
                "found": path_d is not None
            }
        })

    except Exception as e:
        print(f"Error in /api/compare: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# Self-contained local server runner fallback
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
