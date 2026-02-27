import React from 'react';

export default function DivisionFilter({ value, divisions, onChange }) {
  return (
    <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 280 }}>
      <label htmlFor="admin-division-filter">Filter by division</label>
      <select
        id="admin-division-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%' }}
      >
        <option value="">All divisions</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </div>
  );
}
