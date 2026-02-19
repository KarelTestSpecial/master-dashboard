import React, { useState, useEffect, useCallback } from 'react';
import { 
  Rocket, 
  Terminal, 
  Layers, 
  ExternalLink, 
  Activity, 
  Layout,
  Play,
  Square,
  RefreshCw,
  PlusCircle,
  X,
  CheckCircle,
  Folder,
  HelpCircle,
  AlertCircle,
  Cpu,
  HardDrive,
  Github,
  GitBranch,
  CloudUpload
} from 'lucide-react';
import './App.css';

interface RegistryInfo {
  port: number;
  project: string;
  description: string;
  in_use: boolean;
}

interface PortRegistry {
  [key: string]: RegistryInfo;
}

interface PmctlProject {
  name: string;
  description: string;
  tech: string;
  path: string;
  status: string;
  ports: number[];
  open_ports: number[];
  memory_mb: number;
  disk_usage: string;
  token_usage: number;
  relations: string[];
  services?: string[];
  git?: {
    is_repo: boolean;
    branch?: string;
    is_dirty?: boolean;
    remote?: string;
    status_summary?: string;
    error?: string;
  };
}

function App() {
  const [activeTab, setActiveTab] = useState('projects');
  const [registry, setRegistry] = useState<PortRegistry>({});
  const [projects, setProjects] = useState<{[key: string]: PmctlProject}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [processing, setProcessing] = useState<{[key: string]: string | null}>({});
  
  const host = window.location.hostname || 'localhost';

  const fetchRegistry = useCallback(async () => {
    try {
      // 1. Fetch Port Registry
      const regRes = await fetch(`http://${host}:4444/ports`);
      if (regRes.ok) {
        setRegistry(await regRes.json());
      }

      // 2. Fetch Projects from pmctl
      const projRes = await fetch(`http://${host}:7777/api/projects`);
      if (projRes.ok) {
        setProjects(await projRes.json());
        setError(null);
      } else {
        setError("Kan projectlijst niet ophalen van pmctl (:7777)");
      }
    } catch (err) {
      console.error("Connection error:", err);
      setError("Verbindingsfout met backend services.");
    } finally {
      setLoading(false);
    }
  }, [host]);

  useEffect(() => {
    fetchRegistry();
    const interval = setInterval(fetchRegistry, 5000);
    return () => clearInterval(interval);
  }, [fetchRegistry]);

  const handleAction = async (projectId: string, action: 'start' | 'stop' | 'restart' | 'sync') => {
    setProcessing(prev => ({ ...prev, [projectId]: action }));
    
    try {
      const res = await fetch(`http://${host}:7777/api/projects/${projectId}/${action}`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (action === 'sync') {
        if (data.success) {
          alert(`Sync succesvol voor ${projectId}`);
        } else {
          alert(`Sync mislukt voor ${projectId}: ${data.message}`);
        }
      }
      
      // Poll a few times after action
      let attempts = 0;
      const poll = async () => {
        attempts++;
        await fetchRegistry();
        const currentProject = projects[projectId];
        let isDone = false;
        if (action === 'stop') isDone = currentProject?.status === 'stopped';
        if (action === 'start') isDone = currentProject?.status === 'running';
        if (action === 'sync') isDone = !currentProject?.git?.is_dirty;
        
        if (isDone || attempts >= 10) {
          setProcessing(prev => ({ ...prev, [projectId]: null }));
        } else {
          setTimeout(poll, 1000);
        }
      };
      setTimeout(poll, 1000);
    } catch (err) {
      setProcessing(prev => ({ ...prev, [projectId]: null }));
    }
  };

  // New project form state
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    goal: '',
    serviceName: '',
    preferredPort: ''
  });

  return (
    <div className="dashboard">
      <header className="header">
        <div className="logo">
          <Layers size={32} color="#4f46e5" />
          <h1>MASTER DASHBOARD</h1>
        </div>
        <div className="header-actions">
          <div className="system-health">
            <Activity size={18} />
            <span>{loading ? 'Connecting...' : (error ? 'System Sync Error' : 'All Systems Linked')}</span>
            <div className={`status-dot ${loading ? 'yellow' : (error ? 'red' : 'green')}`}></div>
          </div>
        </div>
      </header>

      <nav className="sidebar">
        <button className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}>
          <Rocket size={20} /> Projecten
        </button>
        <button className={activeTab === 'git' ? 'active' : ''} onClick={() => setActiveTab('git')}>
          <Github size={20} /> GitHub Sync
        </button>
        <button className={activeTab === 'ports' ? 'active' : ''} onClick={() => setActiveTab('ports')}>
          <Layout size={20} /> Port Registry
        </button>
        <button className={activeTab === 'sop' ? 'active' : ''} onClick={() => setActiveTab('sop')}>
          <CheckCircle size={20} /> SOP / AI Rules
        </button>
        <div className="sidebar-footer">
          <div className="version">v1.5.0 (Git Edition)</div>
        </div>
      </nav>

      <main className="main-content">
        {error && <div className="error-banner"><AlertCircle size={18} /> {error}</div>}

        {activeTab === 'projects' && (
          <div className="view">
            <div className="header-row">
              <h2 className="section-title">Mijn Ecosysteem</h2>
              <button className="btn btn-outline btn-sm" onClick={fetchRegistry}><RefreshCw size={14} /> Sync</button>
            </div>
            <div className="project-grid">
              {Object.entries(projects).map(([id, project]) => {
                const status = project.status === 'running' ? 'online' : 'offline';
                const isStopping = processing[id] === 'stop' && status === 'online';
                
                return (
                  <div key={id} className="project-card">
                    <div className="card-header">
                      <div className="title-group">
                        <h3>{project.name}</h3>
                        <div className="ports-row">
                          {project.ports.map(p => (
                            <span key={p} className={`port-tag ${project.open_ports.includes(p) ? 'active' : ''}`}>:{p}</span>
                          ))}
                        </div>
                      </div>
                      <div className={`status-badge ${isStopping ? 'stopping' : status}`}>
                        {isStopping ? 'STOPPING' : status.toUpperCase()}
                      </div>
                    </div>
                    
                    <p className="goal">{project.description || "Geen beschrijving"}</p>
                    
                    <div className="project-stats">
                      <div className="mini-stat">
                        <Cpu size={12} /> {project.memory_mb > 0 ? `${project.memory_mb} MB` : '—'}
                      </div>
                      <div className="mini-stat">
                        <HardDrive size={12} /> {project.disk_usage}
                      </div>
                      <div className="tech-tag">{project.tech}</div>
                    </div>

                    <div className="location">
                      <Folder size={14} /> <code>{project.path}</code>
                    </div>
                    
                    <div className="actions">
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => handleAction(id, 'start')}
                        disabled={status === 'online' || !!processing[id]}
                      >
                        {processing[id] === 'start' ? <RefreshCw size={14} className="spin" /> : <Play size={14} />} Start
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAction(id, 'stop')}
                        disabled={status === 'offline' || !!processing[id]}
                      >
                        {processing[id] === 'stop' ? <RefreshCw size={14} className="spin" /> : <Square size={14} />} Stop
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleAction(id, 'restart')}
                        disabled={!!processing[id]}
                      >
                        <RefreshCw size={14} className={processing[id] === 'restart' ? 'spin' : ''} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'git' && (
          <div className="view">
            <h2 className="section-title">GitHub Synchronisatie</h2>
            <div className="git-grid">
              {Object.entries(projects).map(([id, project]) => (
                <div key={id} className="git-card">
                  <div className="git-header">
                    <div className="git-title">
                      <h3>{project.name}</h3>
                      {project.git?.is_repo ? (
                        <span className={`git-badge ${project.git.is_dirty ? 'dirty' : 'clean'}`}>
                          {project.git.is_dirty ? 'WIJZIGINGEN' : 'SCHOON'}
                        </span>
                      ) : (
                        <span className="git-badge none">GEEN REPO</span>
                      )}
                    </div>
                    <div className="git-branch">
                      <GitBranch size={14} /> {project.git?.branch || '—'}
                    </div>
                  </div>
                  
                  <div className="git-body">
                    <div className="git-remote">
                      <ExternalLink size={12} /> <code>{project.git?.remote || 'Geen remote'}</code>
                    </div>
                    {project.git?.is_dirty && (
                      <div className="git-summary">
                        <code>{project.git.status_summary}</code>
                      </div>
                    )}
                  </div>

                  <div className="git-actions">
                    <button 
                      className="btn btn-primary btn-sm btn-full"
                      onClick={() => handleAction(id, 'sync')}
                      disabled={!project.git?.is_repo || !project.git?.is_dirty || !!processing[id]}
                    >
                      {processing[id] === 'sync' ? (
                        <><RefreshCw size={14} className="spin" /> Pushen...</>
                      ) : (
                        <><CloudUpload size={14} /> Commit & Push naar GitHub</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ports' && (
          <div className="view">
            <h2 className="section-title">Centraal Poort Register</h2>
            <div className="port-registry-card">
              <table className="port-table">
                <thead>
                  <tr><th>Poort</th><th>Service</th><th>Project</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {Object.entries(registry).sort((a, b) => a[1].port - b[1].port).map(([name, info]) => (
                    <tr key={name}>
                      <td><code className="port-code">:{info.port}</code></td>
                      <td><strong>{name}</strong></td>
                      <td><span className="project-tag">{info.project}</span></td>
                      <td>
                        <div className="status-cell">
                          <div className={`status-dot ${info.in_use ? 'green' : 'gray'}`}></div>
                          <span>{info.in_use ? 'ACTIEF' : 'IDLE'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sop' && (
          <div className="view">
            <h2 className="section-title">Standard Operating Procedure</h2>
            <div className="sop-card">
              <h3>🤖 AI Agent Protocol</h3>
              <ul className="sop-list">
                <li><strong>1. Poort Check:</strong> Roep <code>GET :4444/ports</code> aan.</li>
                <li><strong>2. Poort Claim:</strong> Registreer via <code>POST :4444/ports/request</code>.</li>
                <li><strong>3. PM2 Setup:</strong> Voeg service toe aan PM2 voor persistentie.</li>
                <li><strong>4. Git Push:</strong> Leg wijzigingen vast via de Git Sync tab.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
