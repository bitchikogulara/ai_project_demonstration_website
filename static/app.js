/* ==========================================================================
   PAC-MAN CONVERGENCE SYSTEM — PREMIUM DYNAMIC JAVASCRIPT CONTROLLER
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // GLOBAL STATE MANAGEMENT
    // ==========================================================================
    const state = {
        grid: [],
        rows: 11,
        cols: 19,
        pacmen: [
            [1, 1],   // P1
            [9, 17],  // P2
            [5, 8],   // P3
        ],
        activePacmenCount: 3,
        selectedPlacerIndex: 0, // Which Pac-Man is currently selected for placing
        editorTool: "wall",     // "wall" or "erase"
        
        // Simulation playback state
        isPlaying: false,
        playbackSpeed: 400, // ms per step
        currentStep: 0,
        totalSteps: 0,
        solutionPathAStar: null,
        solutionPathDFS: null,
        activePath: null,    // Selected path currently animating in single view
        lastStepTime: 0,
        
        // API response holders
        metricsAStar: null,
        metricsDFS: null,
        activeAlgorithm: "a_star", // "a_star", "dfs", or "compare"
        
        // Interactive Labs state
        labA: {
            pacmen: [[1,1], [1,3], [3,1]],
            selected: 0
        },
        labB: {
            pacmen: [[1,1], [2,4], [4,2]],
            selected: 0
        }
    };

    // Constant Project Preset Grid
    const PROJECT_GRID = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    // CSS variables mapped colors for HTML5 Canvas rendering
    const colors = {
        bg: "#0b0e17",
        gridLine: "#1f273d",
        wall: "#192239",
        wallBorder: "#2a3b63",
        pathDot: "rgba(185, 95, 48, 0.15)",
        // Pac-Men Neon Hues
        pacmen: [
            "hsl(45, 100%, 55%)",   // Yellow (P1)
            "hsl(190, 100%, 50%)",  // Cyan (P2)
            "hsl(325, 100%, 55%)",  // Magenta (P3)
            "hsl(140, 90%, 50%)",   // Green (P4)
            "hsl(280, 95%, 60%)"    // Purple (P5)
        ]
    };

    // ==========================================================================
    // DOM ELEMENTS SELECTORS
    // ==========================================================================
    const tabs = document.querySelectorAll(".nav-tab");
    const tabPanes = document.querySelectorAll(".tab-pane");
    
    // Workbench controls
    const gridPresetSelect = document.getElementById("grid-preset");
    const btnRandomMaze = document.getElementById("btn-random-maze");
    const btnClearWalls = document.getElementById("btn-clear-walls");
    const btnRandomPacmen = document.getElementById("btn-random-pacmen");
    const btnRemovePacman = document.getElementById("btn-remove-pacman");
    const btnRunSolver = document.getElementById("btn-run-solver");
    
    const toolWallBtn = document.getElementById("tool-wall");
    const toolEraseBtn = document.getElementById("tool-erase");
    const pacPlacerBtns = document.querySelectorAll(".pac-placer");
    const pacmanCountBadge = document.getElementById("pacman-count-badge");
    
    // Canvases
    const canvasSingle = document.getElementById("canvas-single");
    const canvasCompAStar = document.getElementById("canvas-comp-astar");
    const canvasCompDFS = document.getElementById("canvas-comp-dfs");
    
    // Playback Controls
    const playBtnPrev = document.getElementById("play-btn-prev");
    const playBtnToggle = document.getElementById("play-btn-toggle");
    const playBtnNext = document.getElementById("play-btn-next");
    const playBtnReset = document.getElementById("play-btn-reset");
    const simulationTimeline = document.getElementById("simulation-timeline");
    const simulationSpeed = document.getElementById("simulation-speed");
    
    const timelineCurStep = document.getElementById("timeline-cur-step");
    const timelineTotalSteps = document.getElementById("timeline-total-steps");
    const speedDisplay = document.getElementById("speed-display");
    
    // Metrics View
    const valSearchTime = document.getElementById("val-search-time");
    const valPathSteps = document.getElementById("val-path-steps");
    const valNodesCount = document.getElementById("val-nodes-count");
    const titleExpandedNodes = document.getElementById("title-expanded-nodes");
    const visualizerOverlay = document.getElementById("visualizer-overlay");
    const viewSingle = document.getElementById("view-single");
    const viewComparison = document.getElementById("view-comparison");
    const analyticsExplanation = document.getElementById("analytics-explanation");
    const benchmarkMetricsPanel = document.getElementById("benchmark-metrics-panel");
    
    // Chart Bars
    const barTimeAStar = document.getElementById("bar-time-astar");
    const barTimeDFS = document.getElementById("bar-time-dfs");
    const lblTimeAStar = document.getElementById("lbl-time-astar");
    const lblTimeDFS = document.getElementById("lbl-time-dfs");
    
    const barNodesAStar = document.getElementById("bar-nodes-astar");
    const barNodesDFS = document.getElementById("bar-nodes-dfs");
    const lblNodesAStar = document.getElementById("lbl-nodes-astar");
    const lblNodesDFS = document.getElementById("lbl-nodes-dfs");
    
    const barStepsAStar = document.getElementById("bar-steps-astar");
    const barStepsDFS = document.getElementById("bar-steps-dfs");
    const lblStepsAStar = document.getElementById("lbl-steps-astar");
    const lblStepsDFS = document.getElementById("lbl-steps-dfs");
    
    // Report Navigation
    const tocItems = document.querySelectorAll(".toc-item");
    const reportSections = document.querySelectorAll(".report-section");
    
    // Complexity sliders
    const calcInputM = document.getElementById("calc-input-m");
    const calcInputN = document.getElementById("calc-input-n");
    const calcDisplayM = document.getElementById("calc-display-m");
    const calcDisplayN = document.getElementById("calc-display-n");
    
    const calcValStates = document.getElementById("calc-val-states");
    const calcSciStates = document.getElementById("calc-sci-states");
    const calcValBranching = document.getElementById("calc-val-branching");
    const calcValNodes = document.getElementById("calc-val-nodes");

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    function init() {
        // 1. Setup Navigation
        setupNavigation();
        
        // 2. Setup Report reader
        setupReportTOC();
        
        // 3. Load Project Grid Preset
        loadGridPreset("project");
        
        // 4. Bind editor click & drag logic
        setupCanvasInteraction(canvasSingle, "master");
        setupCanvasInteraction(canvasCompAStar, "astar");
        setupCanvasInteraction(canvasCompDFS, "dfs");
        
        // 5. Setup Complexity calculator
        setupComplexityCalculator();
        
        // 6. Setup Interactive Labs
        setupHeuristicLabs();
        
        // 7. Render initial state
        updateSidebarBadges();
        drawAllCanvases();
        
        // 8. Bind timeline & controllers
        setupPlaybackControls();
        
        // Start animation frame
        requestAnimationFrame(animationLoop);
    }

    // ==========================================================================
    // NAVIGATION & TAB PANES CONTROL
    // ==========================================================================
    function setupNavigation() {
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                // Active state styling
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                
                // Show relevant tab
                const targetTab = tab.getAttribute("data-tab");
                tabPanes.forEach(pane => {
                    pane.classList.remove("active");
                    if (pane.id === `tab-${targetTab}`) {
                        pane.classList.add("active");
                    }
                });
                
                // Redraw canvases if user switches back to workbench or lab
                if (targetTab === "workbench") {
                    setTimeout(drawAllCanvases, 20);
                } else if (targetTab === "heuristic-lab") {
                    setTimeout(() => {
                        drawLabCanvas("a");
                        drawLabCanvas("b");
                    }, 20);
                }
            });
        });
    }

    function setupReportTOC() {
        tocItems.forEach(item => {
            item.addEventListener("click", () => {
                tocItems.forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                
                const targetSec = item.getAttribute("data-section");
                reportSections.forEach(sec => {
                    sec.classList.remove("active");
                    if (sec.id === `sec-${targetSec}`) {
                        sec.classList.add("active");
                    }
                });
            });
        });
    }

    // ==========================================================================
    // MAZE EDITOR & PRESET LOADING
    // ==========================================================================
    gridPresetSelect.addEventListener("change", (e) => {
        loadGridPreset(e.target.value);
    });

    function loadGridPreset(presetName) {
        stopSimulation();
        resetAnalytics();
        
        if (presetName === "project") {
            state.rows = 11;
            state.cols = 19;
            state.grid = JSON.parse(JSON.stringify(PROJECT_GRID));
            state.pacmen = [
                [1, 1],   // P1
                [9, 17],  // P2
                [5, 8],   // P3
            ];
            state.activePacmenCount = 3;
        } else if (presetName === "empty-medium") {
            state.rows = 11;
            state.cols = 19;
            state.grid = Array(11).fill(0).map((_, r) => 
                Array(19).fill(0).map((_, c) => 
                    (r === 0 || r === 10 || c === 0 || c === 18) ? 1 : 0
                )
            );
            state.pacmen = [[1, 1], [9, 17], [5, 9]];
            state.activePacmenCount = 3;
        } else if (presetName === "empty-large") {
            state.rows = 15;
            state.cols = 15;
            state.grid = Array(15).fill(0).map((_, r) => 
                Array(15).fill(0).map((_, c) => 
                    (r === 0 || r === 14 || c === 0 || c === 14) ? 1 : 0
                )
            );
            state.pacmen = [[1, 1], [13, 13], [7, 7]];
            state.activePacmenCount = 3;
        } else if (presetName === "custom-small") {
            state.rows = 7;
            state.cols = 7;
            state.grid = Array(7).fill(0).map((_, r) => 
                Array(7).fill(0).map((_, c) => 
                    (r === 0 || r === 6 || c === 0 || c === 6) ? 1 : 0
                )
            );
            state.pacmen = [[1, 1], [5, 5]];
            state.activePacmenCount = 2;
        }
        
        updateSidebarBadges();
        drawAllCanvases();
    }

    function updateSidebarBadges() {
        // Placer active styling
        pacPlacerBtns.forEach((btn, idx) => {
            btn.classList.remove("active");
            if (state.editorTool === "pacman" && idx === state.selectedPlacerIndex) {
                btn.classList.add("active");
            }
            
            // Highlight placed pacmen
            if (idx < state.activePacmenCount) {
                btn.style.opacity = "1";
            } else {
                btn.style.opacity = "0.4";
            }
        });
        
        pacmanCountBadge.innerText = `${state.activePacmenCount} / 5`;
    }

    // Toggle Editor Modes
    toolWallBtn.addEventListener("click", () => {
        state.editorTool = "wall";
        toolWallBtn.classList.add("active");
        toolEraseBtn.classList.remove("active");
        updateSidebarBadges();
    });

    toolEraseBtn.addEventListener("click", () => {
        state.editorTool = "erase";
        toolEraseBtn.classList.add("active");
        toolWallBtn.classList.remove("active");
        updateSidebarBadges();
    });

    // Placer index clicks
    pacPlacerBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-pacman"));
            state.selectedPlacerIndex = idx;
            state.editorTool = "pacman"; // Switch mode to dedicated pacman placer
            
            // Deactivate Wall/Erase buttons
            toolWallBtn.classList.remove("active");
            toolEraseBtn.classList.remove("active");
            
            // If selecting a pacman that is currently disabled, we activate it!
            if (idx >= state.activePacmenCount) {
                state.activePacmenCount = idx + 1;
                // Position it on a random free cell
                const cell = findRandomFreeCell();
                if (cell) state.pacmen[idx] = cell;
            }
            
            updateSidebarBadges();
            drawAllCanvases();
        });
    });

    // Randomize Maze
    btnRandomMaze.addEventListener("click", () => {
        stopSimulation();
        resetAnalytics();
        
        // Generate random internal walls (22% density)
        for (let r = 1; r < state.rows - 1; r++) {
            for (let c = 1; c < state.cols - 1; c++) {
                // Ensure we don't trap start positions of Pac-Men
                let isPacmanSpawn = false;
                for (let p = 0; p < state.activePacmenCount; p++) {
                    if (state.pacmen[p][0] === r && state.pacmen[p][1] === c) {
                        isPacmanSpawn = true;
                    }
                }
                
                if (!isPacmanSpawn) {
                    state.grid[r][c] = Math.random() < 0.22 ? 1 : 0;
                } else {
                    state.grid[r][c] = 0;
                }
            }
        }
        
        drawAllCanvases();
    });

    // Clear All Walls
    btnClearWalls.addEventListener("click", () => {
        stopSimulation();
        resetAnalytics();
        
        for (let r = 1; r < state.rows - 1; r++) {
            for (let c = 1; c < state.cols - 1; c++) {
                state.grid[r][c] = 0;
            }
        }
        drawAllCanvases();
    });

    // Randomize Pacmen Spawn positions
    btnRandomPacmen.addEventListener("click", () => {
        stopSimulation();
        resetAnalytics();
        
        for (let i = 0; i < state.activePacmenCount; i++) {
            const cell = findRandomFreeCell();
            if (cell) state.pacmen[i] = cell;
        }
        drawAllCanvases();
    });

    // Remove Selected Active Pacman
    btnRemovePacman.addEventListener("click", () => {
        stopSimulation();
        resetAnalytics();
        
        if (state.activePacmenCount <= 1) {
            alert("At least 1 Pac-Man must remain on the board!");
            return;
        }
        
        const removeIdx = state.selectedPlacerIndex;
        // Shift remaining active pacmen down to close the gap
        state.pacmen.splice(removeIdx, 1);
        // Push a default off-placer location to keep array length preallocated to 5
        state.pacmen.push([1, 1]);
        
        // Decrement count
        state.activePacmenCount--;
        
        // Ensure selected index is still in the active bounds
        if (state.selectedPlacerIndex >= state.activePacmenCount) {
            state.selectedPlacerIndex = state.activePacmenCount - 1;
        }
        
        // Retain placer tool mode
        state.editorTool = "pacman";
        
        updateSidebarBadges();
        drawAllCanvases();
    });

    function findRandomFreeCell() {
        const freeCells = [];
        for (let r = 1; r < state.rows - 1; r++) {
            for (let c = 1; c < state.cols - 1; c++) {
                if (state.grid[r][c] === 0) {
                    // Check if another pacman is already there (optional check, they can share cells but let's disperse)
                    freeCells.push([r, c]);
                }
            }
        }
        if (freeCells.length === 0) return null;
        return freeCells[Math.floor(Math.random() * freeCells.length)];
    }

    // ==========================================================================
    // HTML5 CANVAS DRAWING & RENDERING ENGINE
    // ==========================================================================
    function drawAllCanvases() {
        renderGridOnCanvas(canvasSingle, state.grid, state.pacmen, state.activePath, state.currentStep);
        renderGridOnCanvas(canvasCompAStar, state.grid, state.pacmen, state.solutionPathAStar, state.currentStep);
        renderGridOnCanvas(canvasCompDFS, state.grid, state.pacmen, state.solutionPathDFS, state.currentStep);
    }

    function renderGridOnCanvas(canvas, grid, startPacmen, path, stepIndex) {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        
        // Calculate canvas dimensions dynamically based on grid size
        const cellSize = 22; // px per cell
        const width = state.cols * cellSize;
        const height = state.rows * cellSize;
        
        canvas.width = width;
        canvas.height = height;
        
        // 1. Clear background
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);
        
        // 2. Draw grid lines
        ctx.strokeStyle = colors.gridLine;
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= state.rows; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cellSize);
            ctx.lineTo(width, r * cellSize);
            ctx.stroke();
        }
        for (let c = 0; c <= state.cols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cellSize, 0);
            ctx.lineTo(c * cellSize, height);
            ctx.stroke();
        }
        
        // 3. Draw walls (0 = empty, 1 = wall)
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                if (grid[r][c] === 1) {
                    ctx.fillStyle = colors.wall;
                    ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
                    
                    // Neon boundary highlight for outer walls
                    ctx.strokeStyle = colors.wallBorder;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
                }
            }
        }
        
        // 4. Draw solution paths trails (if any solved path exists)
        if (path && path.length > 0) {
            ctx.fillStyle = colors.pathDot;
            for (let s = 0; s < path.length; s++) {
                const stepPositions = path[s];
                stepPositions.forEach(pos => {
                    const r = pos[0];
                    const c = pos[1];
                    ctx.beginPath();
                    ctx.arc(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2, 2.5, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        }
        
        // 5. Draw active step Pac-Men positions
        let activePositions = startPacmen;
        if (path && path.length > 0) {
            // Cap step index safety
            const idx = Math.min(stepIndex, path.length - 1);
            activePositions = path[idx];
        }
        
        // Detect overlaps (pacmen sharing identical cells)
        const cellOverlaps = {};
        activePositions.forEach((pos, agentIdx) => {
            if (agentIdx >= state.activePacmenCount) return;
            const key = `${pos[0]},${pos[1]}`;
            if (!cellOverlaps[key]) cellOverlaps[key] = [];
            cellOverlaps[key].push(agentIdx);
        });
        
        // Render each Pac-Man
        activePositions.forEach((pos, agentIdx) => {
            if (agentIdx >= state.activePacmenCount) return;
            
            const r = pos[0];
            const c = pos[1];
            const centerX = c * cellSize + cellSize / 2;
            const centerY = r * cellSize + cellSize / 2;
            const radius = 8.5;
            
            // Check if cell is shared
            const overlapList = cellOverlaps[`${r},${c}`] || [];
            
            if (overlapList.length > 1) {
                // RENDER GATHERED COMBINED STATE (Neon flashing starburst or shared marker)
                if (overlapList[0] === agentIdx) { // Draw once per cell
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
                    ctx.fillStyle = "hsla(0, 0%, 100%, 0.15)";
                    ctx.fill();
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    
                    // Draw Star/Convergence point
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "800 10px var(--font-sans)";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("*", centerX, centerY);
                }
            } else {
                // RENDER INDIVIDUAL PACMAN AGENT
                const agentColor = colors.pacmen[agentIdx];
                
                // Glow aura
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 3, 0, 2 * Math.PI);
                ctx.fillStyle = agentColor.replace("hsl", "hsla").replace(")", ", 0.25)");
                ctx.fill();
                
                // Pacman shape (Chomping towards center)
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0.2 * Math.PI, 1.8 * Math.PI);
                ctx.lineTo(centerX, centerY);
                ctx.fillStyle = agentColor;
                ctx.fill();
                
                // Eye
                ctx.beginPath();
                ctx.arc(centerX + 2, centerY - 4, 1.5, 0, 2 * Math.PI);
                ctx.fillStyle = "#000000";
                ctx.fill();
                
                // Agent Identifier Label Number (1 to 5)
                ctx.fillStyle = "#ffffff";
                ctx.font = "700 8px var(--font-mono)";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(agentIdx + 1, centerX - 2, centerY + 1);
            }
        });
    }

    // Canvas click & drag to edit grid or place agents
    function setupCanvasInteraction(canvas, viewType) {
        let isDrawing = false;
        
        function handleInteraction(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const cellSize = 22; // matching canvas grid size
            const c = Math.floor(x / cellSize);
            const r = Math.floor(y / cellSize);
            
            // Bounds check
            if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return;
            
            // Prevent drawing on border walls
            if (r === 0 || r === state.rows - 1 || c === 0 || c === state.cols - 1) return;
            
            stopSimulation();
            resetAnalytics();
            
            if (state.editorTool === "wall") {
                // Set wall if not spawning a pacman
                let isSpawn = false;
                for (let p = 0; p < state.activePacmenCount; p++) {
                    if (state.pacmen[p][0] === r && state.pacmen[p][1] === c) isSpawn = true;
                }
                if (!isSpawn) {
                    state.grid[r][c] = 1;
                }
            } else if (state.editorTool === "erase") {
                state.grid[r][c] = 0;
            }
            
            drawAllCanvases();
        }
        
        canvas.addEventListener("mousedown", (e) => {
            // If dragging pacman is handled
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cellSize = 22;
            const c = Math.floor(x / cellSize);
            const r = Math.floor(y / cellSize);
            
            // Check if clicking on empty cell to place the SELECTED Pac-man
            if (state.editorTool === "pacman" && state.selectedPlacerIndex < state.activePacmenCount) {
                if (state.grid[r] && state.grid[r][c] === 0) {
                    state.pacmen[state.selectedPlacerIndex] = [r, c];
                    drawAllCanvases();
                    return;
                }
            }
            
            // If erase tool is active and clicked directly on a Pacman, remove it!
            if (state.editorTool === "erase") {
                let pacmanIdxToRemove = -1;
                for (let p = 0; p < state.activePacmenCount; p++) {
                    if (state.pacmen[p][0] === r && state.pacmen[p][1] === c) {
                        pacmanIdxToRemove = p;
                        break;
                    }
                }
                if (pacmanIdxToRemove !== -1) {
                    if (state.activePacmenCount <= 1) {
                        alert("At least 1 Pac-Man must remain on the board!");
                        return;
                    }
                    stopSimulation();
                    resetAnalytics();
                    
                    // Shift active pacmen
                    state.pacmen.splice(pacmanIdxToRemove, 1);
                    state.pacmen.push([1, 1]); // Maintain default position preallocation
                    state.activePacmenCount--;
                    
                    if (state.selectedPlacerIndex >= state.activePacmenCount) {
                        state.selectedPlacerIndex = state.activePacmenCount - 1;
                    }
                    
                    updateSidebarBadges();
                    drawAllCanvases();
                    return;
                }
            }
            
            isDrawing = true;
            handleInteraction(e);
        });
        
        canvas.addEventListener("mousemove", (e) => {
            if (!isDrawing) return;
            handleInteraction(e);
        });
        
        window.addEventListener("mouseup", () => {
            isDrawing = false;
        });
    }

    // ==========================================================================
    // BACKEND SOLVER API CONNECTOR
    // ==========================================================================
    btnRunSolver.addEventListener("click", () => {
        stopSimulation();
        
        // Determine search method
        const selectedMethod = document.querySelector('input[name="search-method"]:checked').value;
        state.activeAlgorithm = selectedMethod;
        
        // Show Spinner
        visualizerOverlay.classList.remove("hidden");
        
        // Build payload
        const activePacmenList = state.pacmen.slice(0, state.activePacmenCount);
        
        if (selectedMethod === "compare") {
            // Trigger comparative benchmark
            fetch("/api/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grid: state.grid,
                    pacmen: activePacmenList
                })
            })
            .then(res => res.json())
            .then(data => {
                visualizerOverlay.classList.add("hidden");
                
                if (data.success) {
                    state.solutionPathAStar = data.a_star.path;
                    state.solutionPathDFS = data.dfs.path;
                    state.metricsAStar = data.a_star;
                    state.metricsDFS = data.dfs;
                    
                    // Show comparison panels
                    viewSingle.classList.add("hidden");
                    viewComparison.classList.remove("hidden");
                    benchmarkMetricsPanel.classList.remove("hidden");
                    
                    // Update compare metrics bars
                    renderBenchmarkCharts(data.a_star, data.dfs);
                    
                    // Default playback timeline length to the maximum steps so that both finish
                    state.activePath = data.a_star.path;
                    state.totalSteps = Math.max(data.a_star.steps, data.dfs.steps);
                    state.currentStep = 0;
                    
                    setupTimelineSlider();
                    drawAllCanvases();
                    
                    // Play comparison visualizer
                    startSimulation();
                    
                    // Show analytical commentary
                    renderCompareVerdict(data.a_star, data.dfs);
                } else {
                    alert(`Error running compare search: ${data.error}`);
                }
            })
            .catch(err => {
                visualizerOverlay.classList.add("hidden");
                console.error(err);
                alert("API Server Connection error. Make sure Python backend server is running.");
            });
            
        } else {
            // Trigger single solver endpoint
            fetch("/api/solve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grid: state.grid,
                    pacmen: activePacmenList,
                    algorithm: selectedMethod
                })
            })
            .then(res => res.json())
            .then(data => {
                visualizerOverlay.classList.add("hidden");
                
                if (data.success) {
                    if (data.path === null) {
                        alert("No solution found! The maze might be disconnected or budget limit hit.");
                        return;
                    }
                    
                    state.activePath = data.path;
                    state.totalSteps = data.steps;
                    state.currentStep = 0;
                    
                    if (selectedMethod === "a_star") {
                        state.solutionPathAStar = data.path;
                        state.solutionPathDFS = null;
                        titleExpandedNodes.innerText = "Expanded States (A*)";
                    } else {
                        state.solutionPathDFS = data.path;
                        state.solutionPathAStar = null;
                        titleExpandedNodes.innerText = "Visited Nodes (DFS)";
                    }
                    
                    // Show single panel
                    viewSingle.classList.remove("hidden");
                    viewComparison.classList.add("hidden");
                    benchmarkMetricsPanel.classList.add("hidden"); // Hide chart since in single mode
                    
                    // Update single metrics cards
                    valSearchTime.innerHTML = `${data.time_ms.toFixed(2)} <span class="unit">ms</span>`;
                    valPathSteps.innerHTML = `${data.steps} <span class="unit">steps</span>`;
                    valNodesCount.innerText = data.nodes_count.toLocaleString();
                    
                    // Update title
                    document.getElementById("single-panel-title").innerHTML = 
                        `<span class="status-indicator-glow glow-cyan"></span> Active Grid: ${selectedMethod === 'a_star' ? 'A* Informed Solver' : 'Recursive DFS Solver'}`;
                    
                    setupTimelineSlider();
                    drawAllCanvases();
                    startSimulation();
                    
                    // Single Verdict Summary
                    renderSingleVerdict(selectedMethod, data);
                } else {
                    alert(`Error running solver: ${data.error}`);
                }
            })
            .catch(err => {
                visualizerOverlay.classList.add("hidden");
                console.error(err);
                alert("API Server Connection error. Make sure Python backend server is running.");
            });
        }
    });

    function resetAnalytics() {
        state.solutionPathAStar = null;
        state.solutionPathDFS = null;
        state.activePath = null;
        state.currentStep = 0;
        state.totalSteps = 0;
        
        setupTimelineSlider();
        
        valSearchTime.innerHTML = `0.00 <span class="unit">ms</span>`;
        valPathSteps.innerHTML = `0 <span class="unit">steps</span>`;
        valNodesCount.innerText = "0";
        
        viewSingle.classList.remove("hidden");
        viewComparison.classList.add("hidden");
        benchmarkMetricsPanel.classList.add("hidden");
        
        document.getElementById("single-panel-title").innerHTML = `<span class="status-indicator-glow glow-cyan"></span> Active Grid: State Space Builder`;
        
        analyticsExplanation.innerHTML = `
            <span class="verdict-title"><i class="fa-solid fa-circle-info"></i> Simulator Idle</span>
            <p class="verdict-body">Load or customize a maze, place Pac-Men, select an algorithm, and click "EXECUTE" to trigger the spatial AI search.</p>
        `;
    }

    // Update SVG-style bar lengths for benchmark chart
    function renderBenchmarkCharts(astar, dfs) {
        // 1. Time comparisons
        const maxTime = Math.max(astar.time_ms, dfs.time_ms, 0.1);
        const wAStarTime = (astar.time_ms / maxTime) * 100;
        const wDFSTime = (dfs.time_ms / maxTime) * 100;
        
        barTimeAStar.style.width = `${wAStarTime}%`;
        barTimeDFS.style.width = `${wDFSTime}%`;
        lblTimeAStar.innerText = `${astar.time_ms.toFixed(2)}ms`;
        lblTimeDFS.innerText = `${dfs.time_ms.toFixed(2)}ms`;
        
        // 2. Nodes comparisons
        const maxNodes = Math.max(astar.nodes_count, dfs.nodes_count, 1);
        const wAStarNodes = (astar.nodes_count / maxNodes) * 100;
        const wDFSNodes = (dfs.nodes_count / maxNodes) * 100;
        
        barNodesAStar.style.width = `${wAStarNodes}%`;
        barNodesDFS.style.width = `${wDFSNodes}%`;
        lblNodesAStar.innerText = astar.nodes_count.toLocaleString();
        lblNodesDFS.innerText = dfs.nodes_count.toLocaleString();
        
        // 3. Step counts
        const maxSteps = Math.max(astar.steps, dfs.steps, 1);
        const wAStarSteps = (astar.steps / maxSteps) * 100;
        const wDFSSteps = (dfs.steps > 0 ? (dfs.steps / maxSteps) * 100 : 0);
        
        barStepsAStar.style.width = `${wAStarSteps}%`;
        barStepsDFS.style.width = `${wDFSSteps}%`;
        lblStepsAStar.innerText = `${astar.steps} steps`;
        lblStepsDFS.innerText = dfs.found ? `${dfs.steps} steps` : "DNF (Cap)";
    }

    function renderCompareVerdict(astar, dfs) {
        let verdictHTML = `<span class="verdict-title"><i class="fa-solid fa-trophy"></i> A* Outperforms DFS!</span>`;
        
        if (dfs.found === false) {
            verdictHTML += `
                <p class="verdict-body">
                    <strong>DFS Failed to converge:</strong> The uninformed DFS hit the search ceiling of 200,000 nodes without finding a goal, proving the combinatorial explosion of a $5^n$ branching factor!
                    <br><br>
                    <strong>A* Admissible Pruning:</strong> A* successfully pruned the search tree with coordinate-spread lower bounds, converging optimally in <strong>${astar.steps} steps</strong> after expanding only <strong>${astar.nodes_count.toLocaleString()} states</strong>.
                </p>
            `;
        } else {
            const stepsRatio = (dfs.steps / astar.steps).toFixed(1);
            const nodesPruned = (dfs.nodes_count - astar.nodes_count).toLocaleString();
            verdictHTML += `
                <p class="verdict-body">
                    <strong>Optimality Gap:</strong> A* found the optimal solution of <strong>${astar.steps} steps</strong>. DFS found a redundant pathway of <strong>${dfs.steps} steps</strong> (${stepsRatio}x longer!).
                    <br><br>
                    <strong>Search Efficiency:</strong> A* prunes <strong>${nodesPruned} states</strong> out of exploration compared to blind DFS, proving the mathematical strength of Bitchiko's admissible coordinate-spread heuristic.
                </p>
            `;
        }
        analyticsExplanation.innerHTML = verdictHTML;
    }

    function renderSingleVerdict(alg, data) {
        if (alg === "a_star") {
            analyticsExplanation.innerHTML = `
                <span class="verdict-title" style="color: var(--cyber-cyan)"><i class="fa-solid fa-circle-check"></i> A* Optimal Search Complete</span>
                <p class="verdict-body">
                    <strong>Heuristic Success:</strong> The optimal path of <strong>${data.steps} steps</strong> was verified using the admissible coordinate spread heuristic.
                    <br><br>
                    <strong>Explored Nodes:</strong> Exactly ${data.nodes_count.toLocaleString()} configurations were evaluated. Admissibility guarantees this is the mathematically shortest solution.
                </p>
            `;
        } else {
            analyticsExplanation.innerHTML = `
                <span class="verdict-title" style="color: var(--cyber-magenta)"><i class="fa-solid fa-triangle-exclamation"></i> DFS Blind Search Complete</span>
                <p class="verdict-body">
                    <strong>Suboptimal Pathway:</strong> DFS explored ${data.nodes_count.toLocaleString()} states to locate a solution in <strong>${data.steps} steps</strong>.
                    <br><br>
                    <strong>Note:</strong> DFS has no heuristic distance guide and makes arbitrary depth choices, which is why this path length is likely much longer than the A* optimal solution.
                </p>
            `;
        }
    }

    // ==========================================================================
    // SIMULATION TIMELINE PLAYBACK MANAGEMENT
    // ==========================================================================
    function setupPlaybackControls() {
        playBtnToggle.addEventListener("click", () => {
            if (state.isPlaying) {
                stopSimulation();
            } else {
                startSimulation();
            }
        });
        
        playBtnPrev.addEventListener("click", () => {
            stopSimulation();
            if (state.currentStep > 0) {
                state.currentStep--;
                updateTimelineDisplay();
                drawAllCanvases();
            }
        });
        
        playBtnNext.addEventListener("click", () => {
            stopSimulation();
            if (state.currentStep < state.totalSteps) {
                state.currentStep++;
                updateTimelineDisplay();
                drawAllCanvases();
            }
        });
        
        playBtnReset.addEventListener("click", () => {
            stopSimulation();
            state.currentStep = 0;
            updateTimelineDisplay();
            drawAllCanvases();
        });
        
        simulationTimeline.addEventListener("input", (e) => {
            stopSimulation();
            state.currentStep = parseInt(e.target.value);
            updateTimelineDisplay();
            drawAllCanvases();
        });
        
        simulationSpeed.addEventListener("input", (e) => {
            state.playbackSpeed = parseInt(e.target.value);
            speedDisplay.innerText = `${state.playbackSpeed}ms`;
        });
    }

    function setupTimelineSlider() {
        simulationTimeline.min = 0;
        simulationTimeline.max = state.totalSteps;
        simulationTimeline.value = state.currentStep;
        
        timelineCurStep.innerText = state.currentStep;
        timelineTotalSteps.innerText = state.totalSteps;
    }

    function updateTimelineDisplay() {
        simulationTimeline.value = state.currentStep;
        timelineCurStep.innerText = state.currentStep;
    }

    function startSimulation() {
        if (state.totalSteps <= 0) return;
        state.isPlaying = true;
        playBtnToggle.innerHTML = `<i class="fa-solid fa-pause"></i>`;
        playBtnToggle.classList.remove("btn-play");
        playBtnToggle.classList.add("btn-pause");
        state.lastStepTime = Date.now();
    }

    function stopSimulation() {
        state.isPlaying = false;
        playBtnToggle.innerHTML = `<i class="fa-solid fa-play"></i>`;
        playBtnToggle.classList.remove("btn-pause");
        playBtnToggle.classList.add("btn-play");
    }

    // requestAnimationFrame Tick loop
    function animationLoop() {
        if (state.isPlaying) {
            const now = Date.now();
            if (now - state.lastStepTime >= state.playbackSpeed) {
                if (state.currentStep < state.totalSteps) {
                    state.currentStep++;
                    updateTimelineDisplay();
                    drawAllCanvases();
                    state.lastStepTime = now;
                } else {
                    // Loop back or stop
                    stopSimulation();
                }
            }
        }
        requestAnimationFrame(animationLoop);
    }

    // ==========================================================================
    // COMPLEXITY MATRIX CALCULATORS (DYNAMIC FORMULAE)
    // ==========================================================================
    function setupComplexityCalculator() {
        function recomputeComplexity() {
            const M = parseInt(calcInputM.value);
            const n = parseInt(calcInputN.value);
            
            calcDisplayM.innerText = M;
            calcDisplayN.innerText = n;
            
            // 1. State Space size M^n
            const statesVal = Math.pow(M, n);
            calcValStates.innerText = statesVal.toLocaleString();
            
            // Scientific representation
            const exp = Math.floor(Math.log10(statesVal));
            const base = (statesVal / Math.pow(10, exp)).toFixed(2);
            calcSciStates.innerHTML = `${base} &times; 10<sup>${exp}</sup> agent grid state configurations`;
            
            // 2. Branching factor 5^n
            const branchingVal = Math.pow(5, n);
            calcValBranching.innerText = branchingVal.toLocaleString();
            calcValBranching.style.color = "var(--cyber-magenta)";
            
            // 3. Tree Search UCS Node Boundary sum_{i=0}^{M/2 - 1} B^i
            // B = 5^n. Height h = M / 2
            const B = branchingVal;
            const h = Math.floor(M / 2);
            
            // Math boundary formatting (since 3125^50 is massive, we compute base 10 directly)
            // Log10(B^h) = h * Log10(B)
            const logB = Math.log10(B);
            const logTotal = h * logB;
            
            const expTotal = Math.floor(logTotal);
            const baseTotal = Math.pow(10, logTotal - expTotal).toFixed(2);
            
            calcValNodes.innerHTML = `${baseTotal} &times; 10<sup>${expTotal}</sup>`;
        }
        
        calcInputM.addEventListener("input", recomputeComplexity);
        calcInputN.addEventListener("input", recomputeComplexity);
        
        // Run initial compute
        recomputeComplexity();
    }

    // ==========================================================================
    // HEURISTIC LABS INTERACTIVE WORKBENCHES
    // ==========================================================================
    function setupHeuristicLabs() {
        const canvasA = document.getElementById("mini-grid-canvas-a");
        const canvasB = document.getElementById("mini-grid-canvas-b");
        
        // Click interaction for Lab A (Different Pairs)
        canvasA.addEventListener("mousedown", (e) => {
            const rect = canvasA.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const size = 44; // 220px / 5 grid dimensions
            const c = Math.floor(x / size);
            const r = Math.floor(y / size);
            
            if (r >= 0 && r < 5 && c >= 0 && c < 5) {
                // Move current active tester pacman
                state.labA.pacmen[state.labA.selected] = [r, c];
                // Rotate active selector index
                state.labA.selected = (state.labA.selected + 1) % state.labA.pacmen.length;
                
                drawLabCanvas("a");
                recomputeLabAStats();
            }
        });

        // Click interaction for Lab B (Spread / 2)
        canvasB.addEventListener("mousedown", (e) => {
            const rect = canvasB.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const size = 44;
            const c = Math.floor(x / size);
            const r = Math.floor(y / size);
            
            if (r >= 0 && r < 5 && c >= 0 && c < 5) {
                state.labB.pacmen[state.labB.selected] = [r, c];
                state.labB.selected = (state.labB.selected + 1) % state.labB.pacmen.length;
                
                drawLabCanvas("b");
                recomputeLabBStats();
            }
        });
        
        // Initial Draw
        recomputeLabAStats();
        recomputeLabBStats();
    }

    function drawLabCanvas(labName) {
        const canvas = labName === "a" ? document.getElementById("mini-grid-canvas-a") : document.getElementById("mini-grid-canvas-b");
        const pacList = labName === "a" ? state.labA.pacmen : state.labB.pacmen;
        const activeSel = labName === "a" ? state.labA.selected : state.labB.selected;
        
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const size = 44; // 5x5 grid in 220px canvas
        
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, 220, 220);
        
        // Draw grid
        ctx.strokeStyle = colors.gridLine;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * size);
            ctx.lineTo(220, i * size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(i * size, 0);
            ctx.lineTo(i * size, 220);
            ctx.stroke();
        }
        
        // Draw Pac-men
        pacList.forEach((pos, idx) => {
            const r = pos[0];
            const c = pos[1];
            const centerX = c * size + size / 2;
            const centerY = r * size + size / 2;
            const radius = 14;
            const pacColor = colors.pacmen[idx];
            
            // Shared check
            const matches = pacList.filter(p => p[0] === r && p[1] === c);
            
            if (matches.length > 1) {
                if (pacList.indexOf(matches[0]) === idx) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
                    ctx.fillStyle = "hsla(0, 0%, 100%, 0.15)";
                    ctx.fill();
                    ctx.strokeStyle = "#ffffff";
                    ctx.stroke();
                    
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "800 12px var(--font-sans)";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("*", centerX, centerY);
                }
            } else {
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0.2 * Math.PI, 1.8 * Math.PI);
                ctx.lineTo(centerX, centerY);
                ctx.fillStyle = pacColor;
                ctx.fill();
                
                // Highlight marker for next click target
                if (idx === activeSel) {
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 4, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                
                // Eyeball
                ctx.beginPath();
                ctx.arc(centerX + 3, centerY - 5, 2.5, 0, 2 * Math.PI);
                ctx.fillStyle = "#000000";
                ctx.fill();
                
                // Label
                ctx.fillStyle = "#ffffff";
                ctx.font = "700 10px var(--font-mono)";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(idx + 1, centerX - 3, centerY + 2);
            }
        });
    }

    function recomputeLabAStats() {
        const pacList = state.labA.pacmen;
        document.getElementById("lab-a-pacmen-count").innerText = pacList.length;
        
        // Count pairs on different cells
        let differentPairs = 0;
        for (let i = 0; i < pacList.length; i++) {
            for (let j = i + 1; j < pacList.length; j++) {
                if (pacList[i][0] !== pacList[j][0] || pacList[i][1] !== pacList[j][1]) {
                    differentPairs++;
                }
            }
        }
        
        document.getElementById("lab-a-heuristic-val").innerText = differentPairs;
        const verdictBanner = document.getElementById("lab-a-verdict");
        
        // In an empty 5x5 grid, if they can meet in 1 step, actual cost is 1.
        // If differentPairs is > 1 (which it is if they are on 3 different cells: differentPairs = 3), it overestimates since real cost is 1 step!
        if (differentPairs > 1) {
            verdictBanner.innerText = `Overestimates! ${differentPairs} > 1 (Inadmissible)`;
            verdictBanner.className = "verdict-banner error-bg";
        } else {
            verdictBanner.innerText = `Admissible in this state: ${differentPairs} <= 1`;
            verdictBanner.className = "verdict-banner success-bg";
        }
    }

    function recomputeLabBStats() {
        const pacList = state.labB.pacmen;
        
        let xmin = pacList[0][0], xmax = pacList[0][0];
        let ymin = pacList[0][1], ymax = pacList[0][1];
        
        pacList.forEach(pos => {
            if (pos[0] < xmin) xmin = pos[0];
            if (pos[0] > xmax) xmax = pos[0];
            if (pos[1] < ymin) ymin = pos[1];
            if (pos[1] > ymax) ymax = pos[1];
        });
        
        const dx = xmax - xmin;
        const dy = ymax - ymin;
        
        document.getElementById("lab-b-spreads").innerText = `dx: ${dx} | dy: ${dy}`;
        
        const heuristicVal = 0.5 * Math.max(dx, dy);
        document.getElementById("lab-b-heuristic-val").innerText = heuristicVal.toFixed(1);
        
        // Actual convergence cost on empty grid is ceil(max(dx, dy) / 2)
        const actualCost = Math.ceil(0.5 * Math.max(dx, dy));
        
        const verdictBanner = document.getElementById("lab-b-verdict");
        verdictBanner.innerText = `Admissible! ${heuristicVal.toFixed(1)} <= ${actualCost} (Always Optimistic)`;
        verdictBanner.className = "verdict-banner success-bg";
    }

    // ==========================================================================
    // EXECUTION BOOTSTRAP
    // ==========================================================================
    init();
});
