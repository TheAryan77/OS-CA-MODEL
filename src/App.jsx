import React, { useState, useEffect } from 'react';
import DeadlockPreventionButton from './components/DeadlockPreventionButton ';

const DeadlockDetectionSimulator = () => {
  // State for processes, resources, and allocation
  const [processes, setProcesses] = useState([
    { id: 'P1', color: 'bg-blue-500', resources: [], needsResource: null, status: 'running' },
    { id: 'P2', color: 'bg-green-500', resources: [], needsResource: null, status: 'running' },
    { id: 'P3', color: 'bg-yellow-500', resources: [], needsResource: null, status: 'running' },
    { id: 'P4', color: 'bg-purple-500', resources: [], needsResource: null, status: 'running' }
  ]);
  
  const [resources, setResources] = useState([
    { id: 'R1', instances: 1, allocatedTo: [], color: 'bg-red-500' },
    { id: 'R2', instances: 1, allocatedTo: [], color: 'bg-orange-500' },
    { id: 'R3', instances: 1, allocatedTo: [], color: 'bg-pink-500' },
    { id: 'R4', instances: 2, allocatedTo: [], color: 'bg-indigo-500' }
  ]);
  
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [deadlockDetected, setDeadlockDetected] = useState(false);
  const [waitForGraph, setWaitForGraph] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [predictiveMode, setPredictiveMode] = useState(true);

  // Function to detect deadlocks
  const detectDeadlock = () => {
    // Create wait-for graph
    const waitForEdges = [];
    processes.forEach(process => {
      if (process.needsResource) {
        const blockedBy = resources.find(r => r.id === process.needsResource)?.allocatedTo || [];
        blockedBy.forEach(blockerId => {
          if (blockerId !== process.id) {
            waitForEdges.push({
              from: process.id,
              to: blockerId,
              resource: process.needsResource
            });
          }
        });
      }
    });
    
    setWaitForGraph(waitForEdges);
    
    // Check for cycles in wait-for graph (deadlock)
    const visited = new Set();
    const recStack = new Set();
    
    const hasCycle = (node, graph) => {
      if (!visited.has(node)) {
        visited.add(node);
        recStack.add(node);
        
        const neighbors = graph.filter(edge => edge.from === node).map(edge => edge.to);
        
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && hasCycle(neighbor, graph)) {
            return true;
          } else if (recStack.has(neighbor)) {
            // Found a cycle
            return true;
          }
        }
      }
      
      recStack.delete(node);
      return false;
    };
    
    // Check each process
    let hasDeadlock = false;
    for (const process of processes) {
      if (!visited.has(process.id) && hasCycle(process.id, waitForEdges)) {
        hasDeadlock = true;
        break;
      }
    }
    
    if (hasDeadlock) {
      setDeadlockDetected(true);
      addAiLog("⚠️ Deadlock detected in the system. Initiating resolution strategy.");
      return true;
    }
    
    setDeadlockDetected(false);
    return false;
  };
  
  // AI prediction function
  const predictDeadlock = () => {
    if (!predictiveMode) return false;
    
    setAiThinking(true);
    setTimeout(() => {
      // Simple prediction algorithm: if resources are almost fully allocated
      // and multiple processes are waiting, deadlock is likely
      
      const waitingProcesses = processes.filter(p => p.needsResource !== null).length;
      const resourceSaturation = resources.filter(r => 
        r.allocatedTo.length >= r.instances
      ).length / resources.length;
      
      const deadlockProbability = waitingProcesses / processes.length * resourceSaturation;
      
      if (deadlockProbability > 0.5 && waitingProcesses >= 2) {
        addAiLog(`🔮 AI predicts ${Math.round(deadlockProbability * 100)}% chance of deadlock. Recommending preemptive action.`);
        preventDeadlock();
      } else if (deadlockProbability > 0) {
        addAiLog(`🔮 AI predicts ${Math.round(deadlockProbability * 100)}% chance of deadlock. Monitoring situation.`);
      }
      
      setAiThinking(false);
    }, 800);
  };
  
  // Prevent or resolve deadlock
  const preventDeadlock = () => {
    // Strategy: preemptively release a resource from the process that has the most
    const processesCopy = [...processes];
    const resourcesCopy = [...resources];
    
    // Find process with most resources that's part of a potential deadlock
    const processesInDeadlock = processes.filter(p => p.needsResource !== null);
    
    if (processesInDeadlock.length === 0) return;
    
    // Sort by number of resources held
    processesInDeadlock.sort((a, b) => b.resources.length - a.resources.length);
    
    if (processesInDeadlock[0].resources.length === 0) {
      // No resources to release, abort a process instead
      const targetProcess = processesInDeadlock[0];
      const idx = processesCopy.findIndex(p => p.id === targetProcess.id);
      processesCopy[idx] = {
        ...processesCopy[idx],
        resources: [],
        needsResource: null,
        status: 'aborted'
      };
      
      addAiLog(`🛑 AI Resolution: Process ${targetProcess.id} has been aborted to prevent deadlock.`);
    } else {
      // Release a resource
      const targetProcess = processesInDeadlock[0];
      const resourceToRelease = targetProcess.resources[0];
      
      // Remove resource from process
      const processIdx = processesCopy.findIndex(p => p.id === targetProcess.id);
      processesCopy[processIdx] = {
        ...processesCopy[processIdx],
        resources: processesCopy[processIdx].resources.filter(r => r !== resourceToRelease)
      };
      
      // Update resource allocation
      const resourceIdx = resourcesCopy.findIndex(r => r.id === resourceToRelease);
      resourcesCopy[resourceIdx] = {
        ...resourcesCopy[resourceIdx],
        allocatedTo: resourcesCopy[resourceIdx].allocatedTo.filter(p => p !== targetProcess.id)
      };
      
      addAiLog(`🔄 AI Resolution: Released resource ${resourceToRelease} from ${targetProcess.id} to prevent deadlock.`);
    }
    
    setProcesses(processesCopy);
    setResources(resourcesCopy);
    setDeadlockDetected(false);
  };
  
  // Simulate a step in resource allocation
  const simulateStep = () => {
    if (deadlockDetected) {
      preventDeadlock();
      return;
    }
    
    const processesCopy = [...processes];
    const resourcesCopy = [...resources];
    
    // Phase 1: Processes that need resources try to acquire them
    processes.forEach((process, idx) => {
      if (process.status !== 'running') return;
      
      if (process.needsResource) {
        const resourceIdx = resourcesCopy.findIndex(r => r.id === process.needsResource);
        if (resourceIdx >= 0) {
          const resource = resourcesCopy[resourceIdx];
          
          // Check if resource is available
          if (resource.allocatedTo.length < resource.instances) {
            // Acquire resource
            processesCopy[idx] = {
              ...process,
              resources: [...process.resources, resource.id],
              needsResource: null
            };
            
            resourcesCopy[resourceIdx] = {
              ...resource,
              allocatedTo: [...resource.allocatedTo, process.id]
            };
            
            addAiLog(`✅ Process ${process.id} acquired ${resource.id}`);
          }
        }
      }
    });
    
    // Phase 2: Processes might release resources or request new ones
    processesCopy.forEach((process, idx) => {
      if (process.status !== 'running') return;
      
      // Random chance to release resources
      if (process.resources.length > 0 && Math.random() < 0.2) {
        const releasedResource = process.resources[Math.floor(Math.random() * process.resources.length)];
        processesCopy[idx] = {
          ...process,
          resources: process.resources.filter(r => r !== releasedResource)
        };
        
        const resourceIdx = resourcesCopy.findIndex(r => r.id === releasedResource);
        resourcesCopy[resourceIdx] = {
          ...resourcesCopy[resourceIdx],
          allocatedTo: resourcesCopy[resourceIdx].allocatedTo.filter(p => p !== process.id)
        };
        
        addAiLog(`📤 Process ${process.id} released ${releasedResource}`);
      }
      
      // Random chance to request a new resource if not already waiting
      if (process.needsResource === null && Math.random() < 0.3) {
        // Find a resource not already held
        const availableResources = resourcesCopy
          .filter(r => !process.resources.includes(r.id))
          .map(r => r.id);
        
        if (availableResources.length > 0) {
          const requestedResource = availableResources[Math.floor(Math.random() * availableResources.length)];
          processesCopy[idx] = {
            ...process,
            needsResource: requestedResource
          };
          
          addAiLog(`📥 Process ${process.id} requested ${requestedResource}`);
        }
      }
    });
    
    setProcesses(processesCopy);
    setResources(resourcesCopy);
    
    // Run deadlock detection
    const hasDeadlock = detectDeadlock();
    
    // If no deadlock, run prediction (if enabled)
    if (!hasDeadlock) {
      predictDeadlock();
    }
  };
  
  // Add a log entry
  const addAiLog = (message) => {
    setAiLogs(prev => [
      { id: Date.now(), message, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9)
    ]);
  };
  
  // Reset simulation
  const resetSimulation = () => {
    setIsRunning(false);
    setDeadlockDetected(false);
    setWaitForGraph([]);
    setAiLogs([]);
    setProcesses([
      { id: 'P1', color: 'bg-blue-500', resources: [], needsResource: null, status: 'running' },
      { id: 'P2', color: 'bg-green-500', resources: [], needsResource: null, status: 'running' },
      { id: 'P3', color: 'bg-yellow-500', resources: [], needsResource: null, status: 'running' },
      { id: 'P4', color: 'bg-purple-500', resources: [], needsResource: null, status: 'running' }
    ]);
    setResources([
      { id: 'R1', instances: 1, allocatedTo: [], color: 'bg-red-500' },
      { id: 'R2', instances: 1, allocatedTo: [], color: 'bg-orange-500' },
      { id: 'R3', instances: 1, allocatedTo: [], color: 'bg-pink-500' },
      { id: 'R4', instances: 2, allocatedTo: [], color: 'bg-indigo-500' }
    ]);
    addAiLog("🔄 Simulation reset");
  };
  
  // Run simulation on interval
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(simulateStep, simulationSpeed);
    }
    return () => clearInterval(interval);
  }, [isRunning, processes, resources, simulationSpeed, deadlockDetected]);
  
  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h1 className="text-2xl font-bold">AI-Based Deadlock Detection Simulator</h1>
          <p className="text-sm">Visualizing how AI can predict and prevent deadlocks in multi-threaded applications</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
          {/* Left panel - Controls */}
          <div className="col-span-1 bg-gray-50 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Simulation Controls</h2>
            
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Simulation:</span>
                <button 
                  className={`px-4 py-2 rounded font-medium ${isRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                  onClick={() => setIsRunning(!isRunning)}
                >
                  {isRunning ? 'Pause' : 'Start'}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Speed:</span>
                <select 
                  className="border rounded p-2"
                  value={simulationSpeed}
                  onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                >
                  <option value="2000">Slow</option>
                  <option value="1000">Normal</option>
                  <option value="500">Fast</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">AI Prediction:</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={predictiveMode}
                    onChange={() => setPredictiveMode(!predictiveMode)}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="pt-2">
                <button 
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
                  onClick={resetSimulation}
                >
                  Reset Simulation
                </button>
              </div>
              
              <div className="pt-2">
                <button 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                  onClick={simulateStep}
                  disabled={isRunning}
                >
                  Step Forward
                </button>
              </div>
              
            
            </div>
            <div>
            {/* Prevention Button Component */}
            <DeadlockPreventionButton 
                deadlockDetected={deadlockDetected} 
                onPreventDeadlock={preventDeadlock}
                processes={processes}
                resources={resources}
              />
              
              {deadlockDetected && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                  <p className="font-bold">Deadlock Detected!</p>
                  <p className="text-sm">Use the prevention button to resolve it.</p>
                </div>
              )}
              
              {aiThinking && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
                  <p className="font-bold">AI is analyzing...</p>
                  <p className="text-sm">Predicting potential deadlocks.</p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold mb-2">System Status</h3>
              <div className="space-y-1">
                {processes.map(process => (
                  <div key={process.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <span className={`${process.color} w-3 h-3 rounded-full mr-2`}></span>
                      <span className="font-medium">{process.id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      process.status === 'running' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {process.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Middle panel - Resource Allocation Graph */}
          <div className="col-span-1 lg:col-span-2 bg-gray-50 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Resource Allocation Graph</h2>
            
            <div className="relative h-64 bg-white rounded border overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 800 400">
                {/* Draw processes */}
                {processes.map((process, i) => (
                  <g key={`process-${process.id}`} transform={`translate(200, ${100 + i * 80})`}>
                    <circle 
                      r="20" 
                      className={`${process.color} ${process.status === 'aborted' ? 'opacity-50' : ''}`} 
                      stroke={deadlockDetected && process.needsResource ? "red" : "white"} 
                      strokeWidth="2"
                    />
                    <text 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fill="white" 
                      fontWeight="bold"
                    >
                      {process.id}
                    </text>
                    
                    {/* Show resource request if any */}
                    {process.needsResource && (
                      <g>
                        <line 
                          x1="25" 
                          y1="0" 
                          x2="70" 
                          y2="0" 
                          stroke={deadlockDetected ? "red" : "#666"} 
                          strokeWidth="2" 
                          strokeDasharray="4 2"
                        />
                        <polygon 
                          points="65,5 75,0 65,-5" 
                          fill={deadlockDetected ? "red" : "#666"} 
                        />
                        <text 
                          x="50" 
                          y="-10" 
                          textAnchor="middle" 
                          fill={deadlockDetected ? "red" : "#666"} 
                          fontSize="10"
                        >
                          wants {process.needsResource}
                        </text>
                      </g>
                    )}
                  </g>
                ))}
                
                {/* Draw resources */}
                {resources.map((resource, i) => (
                  <g key={`resource-${resource.id}`} transform={`translate(400, ${100 + i * 80})`}>
                    <rect 
                      x="-20" 
                      y="-20" 
                      width="40" 
                      height="40" 
                      className={resource.color} 
                      stroke="white" 
                      strokeWidth="2"
                    />
                    <text 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fill="white" 
                      fontWeight="bold"
                    >
                      {resource.id}
                    </text>
                    <text 
                      x="0" 
                      y="30" 
                      textAnchor="middle" 
                      fill="gray" 
                      fontSize="10"
                    >
                      {resource.allocatedTo.length}/{resource.instances} used
                    </text>
                  </g>
                ))}
                
                {/* Draw allocation edges */}
                {processes.map(process => 
                  process.resources.map(resourceId => {
                    const resourceIndex = resources.findIndex(r => r.id === resourceId);
                    const processIndex = processes.findIndex(p => p.id === process.id);
                    
                    return (
                      <g key={`alloc-${process.id}-${resourceId}`}>
                        <line 
                          x1="400" 
                          y1={100 + resourceIndex * 80} 
                          x2="220" 
                          y2={100 + processIndex * 80} 
                          stroke="#333" 
                          strokeWidth="1.5" 
                        />
                        <polygon 
                          points={`225,${97 + processIndex * 80} 220,${100 + processIndex * 80} 225,${103 + processIndex * 80}`} 
                          fill="#333" 
                        />
                      </g>
                    );
                  })
                )}
                
                {/* Wait-for graph edges */}
                {waitForGraph.map((edge, i) => {
                  const fromIndex = processes.findIndex(p => p.id === edge.from);
                  const toIndex = processes.findIndex(p => p.id === edge.to);
                  
                  if (fromIndex >= 0 && toIndex >= 0) {
                    const curve = 30 + (i % 3) * 10; // Varied curve to separate multiple edges
                    
                    return (
                      <g key={`wait-${edge.from}-${edge.to}`}>
                        <path 
                          d={`M 200,${100 + fromIndex * 80} C ${200 - curve},${100 + fromIndex * 80} ${200 - curve},${100 + toIndex * 80} 200,${100 + toIndex * 80}`} 
                          stroke="red" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 2" 
                          fill="transparent" 
                        />
                        <polygon 
                          points={`195,${97 + toIndex * 80} 200,${100 + toIndex * 80} 195,${103 + toIndex * 80}`} 
                          fill="red" 
                        />
                      </g>
                    );
                  }
                  return null;
                })}
              </svg>
              
              <div className="absolute bottom-2 right-2 bg-white bg-opacity-80 p-1 rounded text-xs">
                <div className="flex items-center mb-1">
                  <div className="w-3 h-1 bg-gray-800 mr-1"></div>
                  <span>Has resource</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-1 bg-red-500 mr-1" style={{ borderStyle: 'dashed' }}></div>
                  <span>Waiting for</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold mb-2">AI Logs</h3>
              <div className="h-40 overflow-y-auto bg-gray-800 rounded p-3 text-sm font-mono">
                {aiLogs.length === 0 ? (
                  <div className="text-gray-500">AI logs will appear here...</div>
                ) : (
                  aiLogs.map(log => (
                    <div key={log.id} className="mb-1 text-green-400">
                      <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t">
          <h2 className="text-lg font-semibold mb-2">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded shadow">
              <h3 className="font-medium text-blue-600">Detection</h3>
              <p>The system constructs a resource allocation graph and analyzes it for cycles, which indicate deadlocks. It uses wait-for graphs to identify circular dependencies.</p>
            </div>
            <div className="bg-white p-3 rounded shadow">
              <h3 className="font-medium text-purple-600">Prediction</h3>
              <p>The AI predicts potential deadlocks by analyzing resource utilization patterns, process wait times, and historical allocation behaviors before actual deadlocks occur.</p>
            </div>
            <div className="bg-white p-3 rounded shadow">
              <h3 className="font-medium text-green-600">Prevention</h3>
              <p>When deadlocks are predicted or detected, the AI can preemptively release resources, prioritize critical processes, or abort low-priority processes to maintain system health.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeadlockDetectionSimulator;