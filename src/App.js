import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import './styles.css';

// -----------------------------------------------------------------------------
// PLACEHOLDER: Zakodowany obrazek SVG (56x80px).
// Jest ładowany natychmiastowo z pamięci, bez pobierania z internetu.
// -----------------------------------------------------------------------------
const PLACEHOLDER_IMG = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='80' viewBox='0 0 56 80'%3E%3Crect width='56' height='80' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%2364748b'%3ENo Img%3C/text%3E%3C/svg%3E";

const buildCardImageUrl = (character, series, edition) => {
  const slugify = (text) =>
    String(text || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const charSlug = slugify(character);
  const seriesSlug = slugify(series);
  const ed = String(edition).toLowerCase();

  return {
    primary: `https://d2l56h9h5tj8ue.cloudfront.net/images/cards/${charSlug}-${seriesSlug}-${ed}.jpg`,
    fallback: `https://d2l56h9h5tj8ue.cloudfront.net/images/cards/${charSlug}-${ed}.jpg`
  };
};

const CardFilterApp = () => {
  // ---------------------------------------------------------------------------
  // STAN APLIKACJI
  // ---------------------------------------------------------------------------
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]); 
  const [hiddenCodes, setHiddenCodes] = useState(new Set());
  
  const [loading, setLoading] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); 
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [csvUrl, setCsvUrl] = useState('');
  const [inputMethod, setInputMethod] = useState('file');
  const [urlError, setUrlError] = useState('');

  // Stan filtrów
  const [filters, setFilters] = useState({
    codes: '',
    series: '',
    numberFrom: '',
    numberTo: '',
    wishlistsFrom: '',
    wishlistsTo: '',
    editions: [],
    morphed: false,
    trimmed: false,
    frame: false,
    hasDyeName: false,
    tag: '',
    noneTag: false,
    blacklistSeries: '',
    blacklistCharacter: '',
    blacklistTag: '',
    excludeFrame: false,
    excludeMorphed: false,
    excludeTrimmed: false,
    excludeDyeName: false
  });

  const [notFoundCodes, setNotFoundCodes] = useState([]);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [codesDisplayFormat, setCodesDisplayFormat] = useState('50per');
  const [fullImage, setFullImage] = useState(null);

  // ---------------------------------------------------------------------------
  // LOGIKA FILTROWANIA
  // ---------------------------------------------------------------------------
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    
    let results = data;

    // A. Filtr kodów (priorytet)
    if (filters.codes.trim()) {
      const searchCodes = filters.codes.toLowerCase().split(',').map(c => c.trim()).filter(c => c.length > 0);
      
      const codeMap = new Map();
      data.forEach(card => {
        const key = card.code.toLowerCase();
        if(!codeMap.has(key)) codeMap.set(key, []);
        codeMap.get(key).push(card);
      });

      const foundResults = [];
      searchCodes.forEach(sc => {
        if (codeMap.has(sc)) {
          foundResults.push(...codeMap.get(sc));
        }
      });
      return foundResults;
    }

    // B. Standardowe filtry
    return results.filter(card => {
        if (filters.excludeMorphed && card.morphed === "Yes") return false;
        if (filters.excludeTrimmed && card.trimmed === "Yes") return false;
        if (filters.excludeFrame && card.frame && card.frame.trim() !== '') return false;
        if (filters.excludeDyeName && card["dye.name"] && card["dye.name"].trim() !== '') return false;

        if (filters.blacklistSeries && filters.blacklistSeries.split(',').some(s => card.series.toLowerCase().includes(s.trim().toLowerCase()))) return false;
        if (filters.blacklistCharacter && filters.blacklistCharacter.split(',').some(c => card.character.toLowerCase().includes(c.trim().toLowerCase()))) return false;
        if (filters.blacklistTag && filters.blacklistTag.split(',').some(t => (card.tag || '').toLowerCase().includes(t.trim().toLowerCase()))) return false;

        if (filters.series) {
            const includedSeries = filters.series.toLowerCase().split(',').map(s => s.trim());
            if (!includedSeries.some(s => card.series.toLowerCase().includes(s))) return false;
        }
        
        if (filters.numberFrom && parseInt(card.number) < parseInt(filters.numberFrom)) return false;
        if (filters.numberTo && parseInt(card.number) > parseInt(filters.numberTo)) return false;
        if (filters.wishlistsFrom && parseInt(card.wishlists) < parseInt(filters.wishlistsFrom)) return false;
        if (filters.wishlistsTo && parseInt(card.wishlists) > parseInt(filters.wishlistsTo)) return false;
        
        if (filters.editions.length > 0 && !filters.editions.includes(card.edition)) return false;
        
        if (filters.morphed && card.morphed !== "Yes") return false;
        if (filters.trimmed && card.trimmed !== "Yes") return false;
        if (filters.frame && (!card.frame || card.frame === "")) return false;
        if (filters.hasDyeName && (!card["dye.name"] || card["dye.name"] === "")) return false;
        
        if (filters.noneTag) {
            if (card.tag && card.tag.trim() !== '') return false;
        } else if (filters.tag) {
             if (!card.tag.toLowerCase().includes(filters.tag.toLowerCase())) return false;
        }

        return true;
    });
  }, [data, filters]);

  // Efekt uboczny dla notFoundCodes
  useEffect(() => {
    if (filters.codes.trim()) {
        const searchCodes = filters.codes.toLowerCase().split(',').map(c => c.trim()).filter(c => c.length > 0);
        const presentCodes = new Set(data.map(c => c.code.toLowerCase()));
        const notFound = searchCodes.filter(sc => !presentCodes.has(sc));
        setNotFoundCodes(notFound);
    } else {
        setNotFoundCodes([]);
    }
  }, [filters.codes, data]);

  const displayData = useMemo(() => {
    if (hiddenCodes.size === 0) return filteredData;
    return filteredData.filter(card => !hiddenCodes.has(card.code));
  }, [filteredData, hiddenCodes]);

  const sortedDisplayData = useMemo(() => {
    if (!sortField) return displayData;
    
    const sorted = [...displayData];
    sorted.sort((a, b) => {
      if (['number', 'wishlists', 'edition', 'worker.effort'].includes(sortField)) {
        const aVal = parseInt(a[sortField]) || 0;
        const bVal = parseInt(b[sortField]) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return sorted;
  }, [displayData, sortField, sortDirection]);

  // Paginacja
  const totalPages = Math.ceil(sortedDisplayData.length / itemsPerPage) || 1;
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedDisplayData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedDisplayData, currentPage, itemsPerPage]);

  // ---------------------------------------------------------------------------
  // HANDLERY
  // ---------------------------------------------------------------------------
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => {
         if (prev === 'asc') return 'desc';
         setSortField(null);
         return 'asc';
      });
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    if (uploadedFile) {
      setLoading(true);
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
          setHiddenCodes(new Set());
          setLoading(false);
        },
        error: (error) => { console.error(error); setLoading(false); }
      });
    }
  };

  const handleUrlLoad = async () => {
    if (!csvUrl.trim()) { setUrlError('Please enter a URL'); return; }
    if (!csvUrl.toLowerCase().endsWith('.csv')) { setUrlError('URL must point to a .csv file'); return; }
    
    setLoading(true); setUrlError(''); setFile(null);
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(csvUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const csvContent = await response.text();
      
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) { setUrlError('No data found'); setLoading(false); return; }
          setData(results.data);
          setHiddenCodes(new Set());
          setLoading(false);
        },
        error: () => { setUrlError('Error parsing CSV'); setLoading(false); }
      });
    } catch (error) {
      setUrlError(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setCurrentPage(1);
  };

  const handleEditionChange = (edition) => {
    setFilters(prev => {
        const newEditions = prev.editions.includes(edition) 
            ? prev.editions.filter(e => e !== edition)
            : [...prev.editions, edition];
        return { ...prev, editions: newEditions };
    });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      codes: '', series: '', numberFrom: '', numberTo: '', wishlistsFrom: '', wishlistsTo: '',
      editions: [], morphed: false, trimmed: false, frame: false, hasDyeName: false, tag: '', noneTag: false,
      blacklistSeries: '', blacklistCharacter: '', blacklistTag: '', excludeFrame: false, excludeMorphed: false, excludeTrimmed: false, excludeDyeName: false
    });
    setSortField(null);
    setHiddenCodes(new Set());
    setCurrentPage(1);
  };

  const applyFilters = () => {
     setCurrentPage(1);
     setHiddenCodes(new Set());
  };

  const copyCardCodes = () => {
    if (displayData.length === 0) {
        if (hiddenCodes.size > 0) {
             setHiddenCodes(new Set());
             alert("Restored all hidden cards!");
        }
        return;
    }

    const batchSize = 50;
    const cardsToCopy = displayData.slice(0, batchSize);
    const codesStr = cardsToCopy.map(card => prefix.trim() ? `${prefix} ${card.code}` : card.code).join(', ');
    
    navigator.clipboard.writeText(codesStr);
    alert(`Copied ${cardsToCopy.length} codes`);

    setHiddenCodes(prev => {
        const next = new Set(prev);
        cardsToCopy.forEach(c => next.add(c.code));
        return next;
    });
  };

  const copyCardCodesOneLine = () => {
    if (displayData.length === 0) {
         if (hiddenCodes.size > 0) {
             setHiddenCodes(new Set());
             alert("Restored all hidden cards!");
        }
        return;
    }
    
    const card = displayData[0];
    const codeStr = prefix.trim() ? `${prefix} ${card.code}` : card.code;
    navigator.clipboard.writeText(codeStr);
    
    setHiddenCodes(prev => {
        const next = new Set(prev);
        next.add(card.code);
        return next;
    });
  };

  const downloadCardCodes = () => {
    const maxCodesPerLine = 50;
    let content = '';
    for (let i = 0; i < filteredData.length; i += maxCodesPerLine) {
      const batch = filteredData.slice(i, i + maxCodesPerLine);
      const line = batch.map(card => card.code).join(', ');
      content += prefix.trim() ? `${prefix} ${line}\n` : `${line}\n`;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'card_codes.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const downloadCardCodesOneLine = () => {
    const content = filteredData.map(card => prefix.trim() ? `${prefix} ${card.code}` : card.code).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'card_codes_one_per_line.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const generateCodesForModal = () => {
    if (codesDisplayFormat === '50per') {
         let content = '';
         for (let i = 0; i < filteredData.length; i += 50) {
             const batch = filteredData.slice(i, i + 50);
             const line = batch.map(card => card.code).join(', ');
             content += prefix.trim() ? `${prefix} ${line}\n` : `${line}\n`;
         }
         return content;
    } else {
         return filteredData.map(card => prefix.trim() ? `${prefix} ${card.code}` : card.code).join('\n');
    }
  };

  const uniqueEditions = useMemo(() => {
     const eds = new Set(data.map(c => c.edition));
     return Array.from(eds).sort((a,b) => parseInt(a) - parseInt(b));
  }, [data]);

  useEffect(() => {
    document.body.className = isDarkTheme ? 'dark-theme' : '';
  }, [isDarkTheme]);

  // ---------------------------------------------------------------------------
  // RENDER (UI)
  // ---------------------------------------------------------------------------
  return (
    <div className="container">
      <div className="theme-switch-container">
        <span className="theme-icon">☀️</span>
        <label className="theme-switch">
          <input type="checkbox" checked={isDarkTheme} onChange={() => setIsDarkTheme(!isDarkTheme)} />
          <span className="slider"></span>
        </label>
        <span className="theme-icon">🌙</span>
      </div>
      
      <h1 className="header">Card Filter App</h1>
      
      {/* 1. SEKCJA ŁADOWANIA PLIKU */}
      <div className="card">
        <h2>Load CSV Data</h2>
        <div className="form-group">
          <label className="form-label">Choose input method:</label>
          <div className="flex gap-4">
            <div className="checkbox-container">
              <input type="radio" id="file-method" checked={inputMethod === 'file'} onChange={() => { setInputMethod('file'); setUrlError(''); }} className="checkbox" />
              <label htmlFor="file-method" className="checkbox-label">Upload File</label>
            </div>
            <div className="checkbox-container">
              <input type="radio" id="url-method" checked={inputMethod === 'url'} onChange={() => { setInputMethod('url'); setFile(null); }} className="checkbox" />
              <label htmlFor="url-method" className="checkbox-label">Load from URL</label>
            </div>
          </div>
        </div>
        
        {inputMethod === 'file' && (
          <div className="form-group">
            <label className="form-label">Select CSV or TXT file:</label>
            <input type="file" accept=".csv, .txt" onChange={handleFileUpload} className="form-input" />
          </div>
        )}
        
        {inputMethod === 'url' && (
          <div className="form-group">
            <label className="form-label">CSV file URL:</label>
            <div className="flex gap-2">
              <input type="url" value={csvUrl} onChange={(e) => setCsvUrl(e.target.value)} className="form-input" placeholder="https://..." style={{flex: 1}} />
              <button onClick={handleUrlLoad} disabled={loading} className="btn btn-primary">{loading ? 'Loading...' : 'Load CSV'}</button>
            </div>
            {urlError && <div className="url-error"><p className="text-error">{urlError}</p></div>}
          </div>
        )}

        {loading && <p>Loading data...</p>}
        {!loading && data.length > 0 && <p className="text-success">Loaded {data.length} records.</p>}
        
        <div className="form-group mt-4">
          <label className="form-label">Prefix for card codes:</label>
          <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="form-input" placeholder="e.g. kt t1" />
        </div>
      </div>
      
      {/* 2. SEKCJA FILTRÓW */}
      <div className="card">
        <h2>Filters</h2>
        <div className="filter-section">
          <h3 className="filter-section-title">Include Filters</h3>
          
          <div className="form-group">
            <label className="form-label">Search by Card Codes:</label>
            <input type="text" name="codes" value={filters.codes} onChange={handleFilterChange} className="form-input" placeholder="Enter codes separated by commas..." />
            {notFoundCodes.length > 0 && (
              <div className="not-found-codes"><p className="text-warning"><strong>Not found:</strong> {notFoundCodes.join(', ')}</p></div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Series:</label>
            <input type="text" name="series" value={filters.series} onChange={handleFilterChange} className="form-input" disabled={!!filters.codes} placeholder="Comma-separated series..." />
          </div>
          
          <div className="form-group">
            <label className="form-label">Number:</label>
            <div className="flex gap-2">
              <input type="number" name="numberFrom" value={filters.numberFrom} onChange={handleFilterChange} className="form-input" placeholder="From" disabled={!!filters.codes} />
              <input type="number" name="numberTo" value={filters.numberTo} onChange={handleFilterChange} className="form-input" placeholder="To" disabled={!!filters.codes} />
            </div>
          </div>

          <div className="form-group">
             <label className="form-label">Wishlists:</label>
             <div className="flex gap-2">
                <input type="number" name="wishlistsFrom" value={filters.wishlistsFrom} onChange={handleFilterChange} className="form-input" placeholder="From" disabled={!!filters.codes} />
                <input type="number" name="wishlistsTo" value={filters.wishlistsTo} onChange={handleFilterChange} className="form-input" placeholder="To" disabled={!!filters.codes} />
             </div>
          </div>

          <div className="form-group">
             <label className="form-label">Tag:</label>
             <div className="flex gap-2">
                <input type="text" name="tag" value={filters.tag} onChange={handleFilterChange} className="form-input" placeholder="Tag..." disabled={filters.noneTag || !!filters.codes} />
                <button onClick={() => setFilters(prev => ({...prev, noneTag: !prev.noneTag}))} className={`btn ${filters.noneTag ? 'btn-primary' : 'btn-secondary'}`} disabled={!!filters.codes}>None Tag</button>
             </div>
          </div>

          <div className="form-group">
             <div className="flex flex-wrap gap-2">
                {uniqueEditions.map(ed => (
                   <button key={ed} onClick={() => !filters.codes && handleEditionChange(ed)} className={`chip ${filters.editions.includes(ed) ? 'chip-blue' : 'chip-gray'} ${filters.codes ? 'opacity-50' : ''}`} disabled={!!filters.codes}>{ed}</button>
                ))}
             </div>
          </div>

          <div className="form-group">
             <div className="flex flex-wrap gap-2">
                {['morphed', 'trimmed', 'frame', 'hasDyeName'].map(field => (
                   <div key={field} className="checkbox-container">
                      <input type="checkbox" id={field} name={field} checked={filters[field]} onChange={handleFilterChange} className="checkbox" disabled={!!filters.codes} />
                      <label htmlFor={field} className="checkbox-label">{field}</label>
                   </div>
                ))}
             </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button onClick={applyFilters} className="btn btn-primary">Apply Filters / Reset Hidden</button>
            <button onClick={resetFilters} className="btn btn-secondary">Reset Filters</button>
          </div>
        </div>

        <div className="filter-section-divider"></div>

        {/* Exclude Filters */}
        <div className="filter-section">
           <h3 className="filter-section-title">Exclude Filters (Blacklist)</h3>
           <div className="form-group">
              <label className="form-label">Exclude Series:</label>
              <input type="text" name="blacklistSeries" value={filters.blacklistSeries} onChange={handleFilterChange} className="form-input" />
           </div>
           <div className="form-group">
              <label className="form-label">Exclude Characters:</label>
              <input type="text" name="blacklistCharacter" value={filters.blacklistCharacter} onChange={handleFilterChange} className="form-input" />
           </div>
           <div className="form-group">
              <label className="form-label">Exclude Tags:</label>
              <input type="text" name="blacklistTag" value={filters.blacklistTag} onChange={handleFilterChange} className="form-input" />
           </div>
           <div className="form-group">
             <div className="flex flex-wrap gap-2">
                <div className="checkbox-container">
                   <input type="checkbox" id="excludeFrame" name="excludeFrame" checked={filters.excludeFrame} onChange={handleFilterChange} className="checkbox" />
                   <label htmlFor="excludeFrame" className="checkbox-label">Exclude Frame</label>
                </div>
                <div className="checkbox-container">
                   <input type="checkbox" id="excludeMorphed" name="excludeMorphed" checked={filters.excludeMorphed} onChange={handleFilterChange} className="checkbox" />
                   <label htmlFor="excludeMorphed" className="checkbox-label">Exclude Morphed</label>
                </div>
                <div className="checkbox-container">
                   <input type="checkbox" id="excludeTrimmed" name="excludeTrimmed" checked={filters.excludeTrimmed} onChange={handleFilterChange} className="checkbox" />
                   <label htmlFor="excludeTrimmed" className="checkbox-label">Exclude Trimmed</label>
                </div>
                <div className="checkbox-container">
                   <input type="checkbox" id="excludeDyeName" name="excludeDyeName" checked={filters.excludeDyeName} onChange={handleFilterChange} className="checkbox" />
                   <label htmlFor="excludeDyeName" className="checkbox-label">Exclude Dye Name</label>
                </div>
             </div>
           </div>
        </div>
      </div>
      
      {/* 3. WYNIKI */}
      <div className="card">
        <div className="results-header">
           <h2>Results {data.length > 0 ? `(${displayData.length}/${filteredData.length})` : ""}</h2>
           <div className="results-actions">
              <button onClick={copyCardCodes} disabled={filteredData.length === 0} className={`btn ${filteredData.length === 0 ? 'btn-secondary' : 'btn-success'}`}>
                 {displayData.length === 0 && filteredData.length > 0 ? "Restore All" : "Copy 50"}
              </button>
              <button onClick={copyCardCodesOneLine} disabled={filteredData.length === 0} className={`btn ${filteredData.length === 0 ? 'btn-secondary' : 'btn-success'}`}>
                 Copy 1
              </button>
              <button onClick={downloadCardCodes} disabled={filteredData.length === 0} className="btn btn-purple">DL 50</button>
              <button onClick={downloadCardCodesOneLine} disabled={filteredData.length === 0} className="btn btn-purple">DL 1</button>
              <button onClick={() => setShowCodesModal(true)} disabled={filteredData.length === 0} className="btn btn-info">Show Codes</button>
           </div>
        </div>

        {displayData.length > 0 ? (
           <div className="table-container">
             <table className="table">
               <thead>
                 <tr>
                   <th>Image</th>
                   <th onClick={() => handleSort('code')} className="sortable-header">Code {sortField === 'code' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                   <th onClick={() => handleSort('number')} className="sortable-header">Num {sortField === 'number' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                   <th onClick={() => handleSort('edition')} className="sortable-header">Ed {sortField === 'edition' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                   <th onClick={() => handleSort('character')} className="sortable-header">Character</th>
                   <th onClick={() => handleSort('series')} className="sortable-header">Series</th>
                   <th>Quality</th>
                   <th onClick={() => handleSort('wishlists')} className="sortable-header">WL</th>
                   <th>Tag</th>
                 </tr>
               </thead>
               <tbody>
                 {currentItems.map((card) => {
                   const { primary, fallback } = buildCardImageUrl(card.character, card.series, card.edition);
                   return (
                     <tr key={card.code}>
                       <td>
                         <img 
                           src={primary}
                           alt=""
                           className="card-thumb zoomable"
                           loading="lazy"
                           width="56" 
                           height="80"
                           onError={(e) => {
                              if (!e.currentTarget.dataset.triedFallback) {
                                 // Pierwszy błąd: Spróbuj fallback URL
                                 e.currentTarget.dataset.triedFallback = "true";
                                 e.currentTarget.src = fallback;
                              } else {
                                 // Drugi błąd: Wstaw placeholder SVG
                                 e.currentTarget.onerror = null;
                                 e.currentTarget.src = PLACEHOLDER_IMG;
                              }
                           }}
                           onClick={(e) => setFullImage(e.currentTarget.src)}
                         />
                       </td>
                       <td className="code-cell">{card.code}</td>
                       <td>{card.number}</td>
                       <td>{card.edition}</td>
                       <td>{card.character}</td>
                       <td>{card.series}</td>
                       <td>{card.quality}</td>
                       <td>{card.wishlists}</td>
                       <td>{card.tag}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        ) : (
           <p className="no-results">{file ? "No results (or all copied)." : "No data loaded."}</p>
        )}

        {/* Paginacja */}
        {displayData.length > 0 && (
          <div className="pagination-container">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="btn">&laquo;</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="btn">&lsaquo;</button>
            <div className="page-info">
               <span>Page</span>
               <input type="number" min="1" max={totalPages} value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="page-input form-input" />
               <span>of {totalPages}</span>
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="btn">&rsaquo;</button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="btn">&raquo;</button>
            
            <div className="items-per-page">
               <span>Show</span>
               <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="items-select form-input">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100 (High RAM)</option>
               </select>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCodesModal && (
        <div className="modal-overlay" onClick={() => setShowCodesModal(false)}>
           <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>Codes</h3><button className="modal-close" onClick={() => setShowCodesModal(false)}>×</button></div>
              <div className="modal-controls">
                 <div className="modal-format-toggle">
                    <button onClick={() => setCodesDisplayFormat('50per')} className={`btn ${codesDisplayFormat==='50per'?'btn-primary':'btn-secondary'}`}>50/line</button>
                    <button onClick={() => setCodesDisplayFormat('1per')} className={`btn ${codesDisplayFormat==='1per'?'btn-primary':'btn-secondary'}`}>1/line</button>
                 </div>
                 <button onClick={() => { navigator.clipboard.writeText(generateCodesForModal()); alert('Copied!'); }} className="btn btn-success">Copy All</button>
              </div>
              <div className="modal-body"><textarea className="codes-textarea" value={generateCodesForModal()} readOnly rows={15} /></div>
           </div>
        </div>
      )}

      {fullImage && (
         <div className="image-modal-overlay" onClick={() => setFullImage(null)}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()}>
               <img src={fullImage} alt="Full" className="image-modal-full" />
               <button className="image-modal-close" onClick={() => setFullImage(null)}>×</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default CardFilterApp;
