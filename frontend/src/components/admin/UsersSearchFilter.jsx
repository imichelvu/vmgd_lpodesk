import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce.js';

export default function UsersSearchFilter({ value, onChange }) {
  const [searchTerm, setSearchTerm] = useState(value);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm !== value) {
      onChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onChange, value]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  return (
    <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 360 }}>
      <label htmlFor="admin-users-search">Search users</label>
      <input
        id="admin-users-search"
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Name, username, or email"
      />
    </div>
  );
}
