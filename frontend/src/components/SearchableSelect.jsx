import React, { useState, useRef, useEffect } from 'react';

/**
 * Dropdown that opens on click and supports typing to filter options.
 * @param {object} props
 * @param {string|number} props.value - Selected option id (or '' for none)
 * @param {Array<{ id: string|number, [key: string]: any }>} props.options - List of options
 * @param {(value: string|number|null) => void} props.onChange - Called when selection changes
 * @param {(option: object) => string} props.getOptionLabel - e.g. (u) => u.full_name
 * @param {string} [props.placeholder] - Shown when nothing selected
 * @param {string} [props.emptyOptionLabel] - If set, first option is "none" with value '' to clear selection
 * @param {string|number} [props.excludeId] - Option id to omit from list (e.g. current user)
 * @param {boolean} [props.required] - For form validation
 * @param {string} [props.id] - For label htmlFor
 * @param {string} [props.className] - Extra class on trigger
 */
export default function SearchableSelect({
  value,
  options = [],
  onChange,
  getOptionLabel,
  placeholder = 'Select…',
  emptyOptionLabel,
  excludeId,
  required,
  id,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const list = Array.isArray(options) ? options : [];
  const filtered = list.filter((opt) => {
    if (excludeId != null && opt.id === excludeId) return false;
    const label = getOptionLabel ? getOptionLabel(opt) : String(opt.id);
    return !search.trim() || label.toLowerCase().includes(search.trim().toLowerCase());
  });

  const showEmpty = emptyOptionLabel != null;
  const filteredWithEmpty = showEmpty
    ? (search.trim() ? filtered : [{ id: '', __empty: true, label: emptyOptionLabel }, ...filtered])
    : filtered;

  const selectedOption = value == null || value === '' ? null : list.find((o) => String(o.id) === String(value));
  const displayLabel = selectedOption && getOptionLabel ? getOptionLabel(selectedOption) : (showEmpty && (value == null || value === '') ? null : '');

  const close = () => {
    setOpen(false);
    setSearch('');
    setHighlightIndex(0);
  };

  const select = (opt) => {
    onChange(opt.__empty ? null : opt.id);
    close();
  };

  useEffect(() => {
    if (!open) return;
    setHighlightIndex(0);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const listLength = filteredWithEmpty.length;
  useEffect(() => {
    if (!open || listLength === 0) return;
    const idx = Math.min(highlightIndex, listLength - 1);
    listRef.current?.querySelector(`[data-index="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightIndex, listLength]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i < listLength - 1 ? i + 1 : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : listLength - 1));
      return;
    }
    if (e.key === 'Enter' && filteredWithEmpty[highlightIndex]) {
      e.preventDefault();
      select(filteredWithEmpty[highlightIndex]);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select ${open ? 'dropdown-open' : ''} ${className}`.trim()}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={id}
        className="searchable-select-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        aria-invalid={required && !value}
      >
        <span className="searchable-select-value">
          {displayLabel || <span className="searchable-select-placeholder">{placeholder}</span>}
        </span>
        <span className="searchable-select-chevron" aria-hidden>▼</span>
      </button>

      {open && (
        <div className="searchable-select-dropdown" role="listbox">
          <input
            ref={inputRef}
            type="text"
            className="searchable-select-search"
            placeholder="Type to search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                e.preventDefault();
                handleKeyDown(e);
              }
            }}
            aria-label="Filter options"
          />
          <ul ref={listRef} className="searchable-select-list">
            {filteredWithEmpty.length === 0 ? (
              <li className="searchable-select-empty">No matches</li>
            ) : (
              filteredWithEmpty.map((opt, idx) => (
                <li
                  key={opt.__empty ? '__empty' : opt.id}
                  data-index={idx}
                  className={`searchable-select-option ${idx === highlightIndex ? 'highlight' : ''} ${String(opt.id) === String(value) ? 'selected' : ''}`}
                  role="option"
                  aria-selected={String(opt.id) === String(value)}
                  onClick={() => select(opt)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  {opt.__empty ? opt.label : (getOptionLabel ? getOptionLabel(opt) : String(opt.id))}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
