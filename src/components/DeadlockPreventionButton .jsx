import React, { useState } from 'react';

// Prevention method button component that appears only during deadlock
const DeadlockPreventionButton = ({ deadlockDetected, onPreventDeadlock, processes, resources }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Function to generate prevention simulation when button is clicked
  const generatePreventionSimulation = () => {
    setIsSimulating(true);
    
    // Create copy of current state for simulation
    const processesCopy = JSON.parse(JSON.stringify(processes));
    const resourcesCopy = JSON.parse(JSON.stringify(resources));
    
    // Generate steps for the simulation
    const steps = [];
    
    // Step 1: Identify the deadlock
    steps.push({
      description: "Identifying processes involved in deadlock...",
      processes: processesCopy,
      resources: resourcesCopy,
      highlight: processes.filter(p => p.needsResource !== null).map(p => p.id)
    });
    
    // Step 2: Find process with most resources that's part of the deadlock
    const processesInDeadlock = processesCopy.filter(p => p.needsResource !== null);
    processesInDeadlock.sort((a, b) => b.resources.length - a.resources.length);
    const targetProcess = processesInDeadlock[0];
    
    steps.push({
      description: `Selected process ${targetProcess.id} for resource preemption (has ${targetProcess.resources.length} resources).`,
      processes: processesCopy,
      resources: resourcesCopy,
      highlight: [targetProcess.id]
    });
    
    // Step 3: Implement prevention strategy
    const updatedProcesses = [...processesCopy];
    const updatedResources = [...resourcesCopy];
    
    if (targetProcess.resources.length === 0) {
      // Abort process if it has no resources
      const idx = updatedProcesses.findIndex(p => p.id === targetProcess.id);
      updatedProcesses[idx] = {
        ...updatedProcesses[idx],
        resources: [],
        needsResource: null,
        status: 'aborted'
      };
      
      steps.push({
        description: `Process ${targetProcess.id} aborted to resolve deadlock.`,
        processes: updatedProcesses,
        resources: updatedResources,
        highlight: [targetProcess.id]
      });
    } else {
      // Release a resource
      const resourceToRelease = targetProcess.resources[0];
      
      // Step 3a: Highlight resource to be released
      steps.push({
        description: `Preempting resource ${resourceToRelease} from process ${targetProcess.id}...`,
        processes: processesCopy,
        resources: resourcesCopy,
        highlight: [targetProcess.id],
        highlightResource: resourceToRelease
      });
      
      // Remove resource from process
      const processIdx = updatedProcesses.findIndex(p => p.id === targetProcess.id);
      updatedProcesses[processIdx] = {
        ...updatedProcesses[processIdx],
        resources: updatedProcesses[processIdx].resources.filter(r => r !== resourceToRelease)
      };
      
      // Update resource allocation
      const resourceIdx = updatedResources.findIndex(r => r.id === resourceToRelease);
      updatedResources[resourceIdx] = {
        ...updatedResources[resourceIdx],
        allocatedTo: updatedResources[resourceIdx].allocatedTo.filter(p => p !== targetProcess.id)
      };
      
      steps.push({
        description: `Resource ${resourceToRelease} preempted from ${targetProcess.id}. Deadlock resolved.`,
        processes: updatedProcesses,
        resources: updatedResources,
        highlight: [targetProcess.id],
        highlightResource: resourceToRelease
      });
    }
    
    // Step 4: Show resolved state
    steps.push({
      description: "System returned to stable state. Processes can continue execution.",
      processes: updatedProcesses,
      resources: updatedResources,
      highlight: []
    });
    
    setSimulationSteps(steps);
    setCurrentStep(0);
  };
  
  // Function to advance through simulation steps
  const nextStep = () => {
    if (currentStep < simulationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // End simulation and apply prevention
      setIsSimulating(false);
      onPreventDeadlock();
    }
  };
  
  // If not in a deadlock, don't show the button
  if (!deadlockDetected) return null;
  
  // If currently simulating, show the simulation
  if (isSimulating) {
    const step = simulationSteps[currentStep];
    
    return (
      <div className="mt-4 bg-white p-4 rounded-lg shadow-md border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Deadlock Prevention Simulation</h3>
        
        <div className="relative h-64 bg-gray-50 rounded border overflow-hidden mb-4">
          <svg className="w-full h-full" viewBox="0 0 800 400">
            {/* Draw processes */}
            {step.processes.map((process, i) => (
              <g key={`process-${process.id}`} transform={`translate(200, ${100 + i * 80})`}>
                <circle 
                  r="20" 
                  className={`${process.color} ${process.status === 'aborted' ? 'opacity-50' : ''} ${step.highlight.includes(process.id) ? 'animate-pulse' : ''}`} 
                  stroke={step.highlight.includes(process.id) ? "yellow" : "white"} 
                  strokeWidth={step.highlight.includes(process.id) ? "3" : "2"}
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
                      stroke="red" 
                      strokeWidth="2" 
                      strokeDasharray="4 2"
                    />
                    <polygon 
                      points="65,5 75,0 65,-5" 
                      fill="red" 
                    />
                    <text 
                      x="50" 
                      y="-10" 
                      textAnchor="middle" 
                      fill="red" 
                      fontSize="10"
                    >
                      wants {process.needsResource}
                    </text>
                  </g>
                )}
              </g>
            ))}
            
            {/* Draw resources */}
            {step.resources.map((resource, i) => (
              <g key={`resource-${resource.id}`} transform={`translate(400, ${100 + i * 80})`}>
                <rect 
                  x="-20" 
                  y="-20" 
                  width="40" 
                  height="40" 
                  className={`${resource.color} ${step.highlightResource === resource.id ? 'animate-pulse' : ''}`} 
                  stroke={step.highlightResource === resource.id ? "yellow" : "white"} 
                  strokeWidth={step.highlightResource === resource.id ? "3" : "2"}
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
            {step.processes.map(process => 
              process.resources.map(resourceId => {
                const resourceIndex = step.resources.findIndex(r => r.id === resourceId);
                const processIndex = step.processes.findIndex(p => p.id === process.id);
                
                return (
                  <g key={`alloc-${process.id}-${resourceId}`}>
                    <line 
                      x1="400" 
                      y1={100 + resourceIndex * 80} 
                      x2="220" 
                      y2={100 + processIndex * 80} 
                      stroke={step.highlightResource === resourceId && step.highlight.includes(process.id) ? "yellow" : "#333"} 
                      strokeWidth={step.highlightResource === resourceId && step.highlight.includes(process.id) ? "2.5" : "1.5"} 
                    />
                    <polygon 
                      points={`225,${97 + processIndex * 80} 220,${100 + processIndex * 80} 225,${103 + processIndex * 80}`} 
                      fill={step.highlightResource === resourceId && step.highlight.includes(process.id) ? "yellow" : "#333"} 
                    />
                  </g>
                );
              })
            )}
          </svg>
        </div>
        
        <div className="bg-blue-50 p-3 rounded mb-4 border-l-4 border-blue-500">
          <p className="text-blue-800">{step.description}</p>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Step {currentStep + 1} of {simulationSteps.length}
          </div>
          
          <div className="flex space-x-2">
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
              onClick={() => setIsSimulating(false)}
            >
              Cancel
            </button>
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
              onClick={nextStep}
            >
              {currentStep < simulationSteps.length - 1 ? "Next Step" : "Apply Prevention"}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Otherwise, show the prevention button
  return (
    <div className="mt-4">
      <button 
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded flex items-center justify-center"
        onClick={generatePreventionSimulation}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
        </svg>
        Simulate Deadlock Prevention
      </button>
    </div>
  );
};

export default DeadlockPreventionButton;