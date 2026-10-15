import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Camera, Upload, 
  BarChart2, RefreshCw, AlertCircle, Sparkles, FileText 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { api } from '../services/api';

export default function QualityInspection() {
  const [inspections, setInspections] = useState([]);
  const [summary, setSummary] = useState({ total_inspected: 0, passed: 0, defective: 0, defect_rate: 0, defect_breakdown: {} });
  const [inspectionMode, setInspectionMode] = useState('simulated'); // 'simulated' | 'image'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const insp = await api.getInspections({ limit: 50 });
      setInspections(insp);
      const sum = await api.getQualitySummary();
      setSummary(sum);
    } catch (e) {
      console.warn('Error loading quality inspections:', e);
    }
  };

  const handleSimulateInspect = async (forceDefect = null) => {
    const randomId = `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      let payload = {
        product_id: randomId,
        machine_id: 'ROBOT-01',
        inspection_mode: 'simulated',
        result: 'pending',
        defect_type: 'none'
      };

      if (forceDefect) {
        payload.result = 'defect';
        payload.defect_type = forceDefect;
        payload.notes = `Manual QA forced defect: ${forceDefect}`;
      }

      await api.createInspection(payload);
      await loadData();
    } catch (e) {
      alert('Inspection creation failed: ' + e.message);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      setIsProcessing(true);
      setAiResult(null);

      // Computer Vision demo classification simulation
      setTimeout(async () => {
        setIsProcessing(false);
        const defectTypes = ['surface_scratch', 'missing_component', 'visible_crack'];
        const isDefective = Math.random() < 0.4;
        const result = isDefective ? 'defect' : 'pass';
        const defect = isDefective ? defectTypes[Math.floor(Math.random() * defectTypes.length)] : 'none';
        const conf = (88 + Math.random() * 11).toFixed(1);

        setAiResult({
          result,
          defect_type: defect,
          confidence: conf,
          model: 'MobileNetV3-Inspection-v1.4'
        });

        // Record in database
        await api.createInspection({
          product_id: `PROD-IMG-${Math.floor(1000 + Math.random() * 9000)}`,
          machine_id: 'ROBOT-01',
          inspection_mode: 'ai_vision',
          result,
          defect_type: defect,
          confidence_score: parseFloat(conf),
          notes: `Vision model classification (${conf}% confidence)`
        });
        loadData();
      }, 1200);
    }
  };

  const chartData = Object.entries(summary.defect_breakdown || {}).map(([key, count]) => ({
    name: key.replace('_', ' '),
    count
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#38bdf8', '#a855f7'];

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={22} style={{ color: 'var(--status-normal)' }} />
            Machine Vision & Product Quality Inspection
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Automated optical inspection station integrating conveyor sensors with AI defect classification
          </p>
        </div>

        <button className="btn btn-outline" onClick={loadData}>
          <RefreshCw size={14} /> Refresh Records
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card accent-blue">
          <div className="kpi-top">TOTAL INSPECTED</div>
          <div className="kpi-value">{summary.total_inspected}</div>
          <div className="kpi-footer">Automated optical station</div>
        </div>

        <div className="kpi-card accent-green">
          <div className="kpi-top">PASSED PARTS</div>
          <div className="kpi-value">{summary.passed}</div>
          <div className="kpi-footer" style={{ color: 'var(--status-normal)' }}>
            Pass Rate: {summary.total_inspected > 0 ? ((summary.passed / summary.total_inspected) * 100).toFixed(1) : 100}%
          </div>
        </div>

        <div className="kpi-card accent-red">
          <div className="kpi-top">DEFECTIVE PARTS</div>
          <div className="kpi-value">{summary.defective}</div>
          <div className="kpi-footer" style={{ color: 'var(--status-critical)' }}>
            Defect Rate: {summary.defect_rate}%
          </div>
        </div>
      </div>

      {/* Inspection Mode Selector & Testing Playground */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Inspection Station Interactive Controls */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Camera size={18} style={{ color: 'var(--accent-blue)' }} />
              Optical Inspection Station Controls
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`btn ${inspectionMode === 'simulated' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => setInspectionMode('simulated')}
              >
                Conveyor Line Mode
              </button>
              <button 
                className={`btn ${inspectionMode === 'image' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => setInspectionMode('image')}
              >
                Vision AI Upload Mode
              </button>
            </div>
          </div>

          {inspectionMode === 'simulated' ? (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                When products pass beneath the optical gantry, the scanner records structural integrity and passes or flags defects based on configured probabilistic thresholds.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button className="btn btn-success" onClick={() => handleSimulateInspect()}>
                  + Simulate Random Product Inspection
                </button>
                <button className="btn btn-warning" onClick={() => handleSimulateInspect('surface_scratch')}>
                  + Inject Surface Scratch
                </button>
                <button className="btn btn-danger" onClick={() => handleSimulateInspect('visible_crack')}>
                  + Inject Structural Crack
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Upload a workpiece photo or sample image for optical inspection model evaluation:
              </p>

              <div style={{ border: '2px dashed var(--panel-border)', borderRadius: '8px', padding: '24px', textAlign: 'center', marginBottom: '14px' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="vision-upload" 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
                <label htmlFor="vision-upload" className="btn btn-outline" style={{ cursor: 'pointer', margin: '0 auto' }}>
                  <Upload size={16} /> Choose Image to Inspect
                </label>
              </div>

              {uploadedImage && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--panel-secondary)', padding: '12px', borderRadius: '8px' }}>
                  <img 
                    src={uploadedImage} 
                    alt="Inspection preview" 
                    style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--panel-border)' }} 
                  />
                  <div>
                    {isProcessing ? (
                      <div style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} /> Analyzing surface features...
                      </div>
                    ) : aiResult ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className={`badge ${aiResult.result === 'pass' ? 'badge-running' : 'badge-critical'}`}>
                            {aiResult.result.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Confidence: {aiResult.confidence}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          Classification: <strong>{aiResult.defect_type.replace('_', ' ')}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Model: {aiResult.model}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Defect Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BarChart2 size={18} style={{ color: 'var(--accent-blue)' }} />
              Defect Classification Breakdown
            </div>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            {chartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No defects recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#111c2f', borderColor: '#38bdf8', fontSize: '0.75rem' }} />
                  <Bar dataKey="count" name="Occurrences" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
            Recent Inspection Records
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Machine</th>
                <th>Mode</th>
                <th>Result</th>
                <th>Defect Category</th>
                <th>Duration</th>
                <th>Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {inspections.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No inspection events logged yet. Start the conveyor or simulate an inspection above.
                  </td>
                </tr>
              ) : (
                inspections.slice(0, 15).map(i => (
                  <tr key={i.id}>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{i.product_id}</td>
                    <td>{i.machine_id}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
                        {i.inspection_mode}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${i.result === 'pass' ? 'badge-running' : 'badge-critical'}`}>
                        {i.result}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {i.defect_type === 'none' ? '—' : i.defect_type.replace('_', ' ')}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.78rem' }}>
                      {i.inspection_duration_ms ? `${i.inspection_duration_ms} ms` : '—'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {i.created_at ? new Date(i.created_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
