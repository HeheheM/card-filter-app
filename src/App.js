// Sort function
  const handleSort = (field) => {
    // If clicking the same field, toggle direction or reset
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Reset sorting
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Apply sorting to data
  const getSortedData = (data) => {
    if (!sortField) return data;
    
    const sortedData = [...data];
    
    sortedData.sort((a, b) => {
      // Handle numeric fields
      if (['number', 'wishlists', 'edition'].includes(sortField)) {
        const aVal = parseInt(a[sortField]) || 0;
        const bVal = parseInt(b[sortField]) || 0;
        
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string fields
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      
      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
    
    return sortedData;
  };import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import './styles.css';

const CardFilterApp = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copyBatch, setCopyBatch] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Default to dark theme
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10 items per page
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({
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
    noneTag: false
  });
  
  // Calculate the total number of pages
  const totalPages = Math.ceil(displayData.length / itemsPerPage);
  
  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const sortedData = getSortedData(displayData);
    return sortedData.slice(startIndex, endIndex);
  };
  
  // Pagination controls
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);
  
  // Handle direct page input
  const handlePageInput = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      setCurrentPage(value);
    }
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  // Set document title
  useEffect(() => {
    document.title = "Karuta Cards Tool";
  }, []);
  
  // Theme toggle effect
  useEffect(() => {
    // Check if theme preference exists in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark');
    }
    
    // Apply theme class to document
    applyTheme(savedTheme === 'dark' || (savedTheme === null && isDarkTheme));
  }, []);
  
  // Function to apply the theme
  const applyTheme = (dark) => {
    if (dark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };
  
  // Function to toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };
  
  // Handle file upload
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    
    if (uploadedFile) {
      setLoading(true);
      const content = await readFileContent(uploadedFile);
      
      Papa.parse(content, {
        header: true,
        complete: (results) => {
          setData(results.data);
          setFilteredData(results.data);
          setDisplayData(results.data);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        }
      });
    }
  };
  
  // Read file content
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };
  
  // Initialize empty state - no automatic data loading
  useEffect(() => {
    // Only process data if a file has been selected by the user
    if (file) {
      const processCSVData = (csvText) => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            setData(results.data);
            setFilteredData(results.data);
            setDisplayData(results.data);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
          }
        });
      };
      
      // If needed in the future, process file data here
    } else {
      // Reset data states when no file is loaded
      setData([]);
      setFilteredData([]);
      setDisplayData([]);
    }
  }, [file]);
  
  // Apply filters function
  const applyFilters = () => {
    let results = [...data];
    
    // Filter by series
    if (filters.series) {
      results = results.filter(card => 
        card.series.toLowerCase().includes(filters.series.toLowerCase())
      );
    }
    
    // Filter by number range
    if (filters.numberFrom) {
      results = results.filter(card => 
        parseInt(card.number) >= parseInt(filters.numberFrom)
      );
    }
    
    if (filters.numberTo) {
      results = results.filter(card => 
        parseInt(card.number) <= parseInt(filters.numberTo)
      );
    }
    
    // Filter by wishlists range
    if (filters.wishlistsFrom) {
      results = results.filter(card => 
        parseInt(card.wishlists) >= parseInt(filters.wishlistsFrom)
      );
    }
    
    if (filters.wishlistsTo) {
      results = results.filter(card => 
        parseInt(card.wishlists) <= parseInt(filters.wishlistsTo)
      );
    }
    
    // Filter by editions
    if (filters.editions.length > 0) {
      results = results.filter(card => 
        filters.editions.includes(card.edition)
      );
    }
    
    // Filter by morphed
    if (filters.morphed) {
      results = results.filter(card => card.morphed === "Yes");
    }
    
    // Filter by trimmed
    if (filters.trimmed) {
      results = results.filter(card => card.trimmed === "Yes");
    }
    
    // Filter by frame
    if (filters.frame) {
      results = results.filter(card => card.frame !== "");
    }
    
    // Filter by dye.name
    if (filters.hasDyeName) {
      results = results.filter(card => card["dye.name"] !== "");
    }
    
    // Filter by tag
    if (filters.tag) {
      results = results.filter(card => 
        card.tag.toLowerCase().includes(filters.tag.toLowerCase())
      );
    }
    
    // Filter for cards with no tag
    if (filters.noneTag) {
      results = results.filter(card => 
        !card.tag || card.tag.trim() === ''
      );
    }
    
    setFilteredData(results);
    setDisplayData(results);
    // Reset pagination when filters change
    setCurrentPage(1);
    // Reset copy batch when filters change
    setCopyBatch(0);
    setCopiedAll(false);
  };
  
  // Handle filter changes - back to manual filtering
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle edition selection - back to manual filtering
  const handleEditionChange = (edition) => {
    const newEditions = [...filters.editions];
    
    if (newEditions.includes(edition)) {
      const index = newEditions.indexOf(edition);
      newEditions.splice(index, 1);
    } else {
      newEditions.push(edition);
    }
    
    setFilters({
      ...filters,
      editions: newEditions
    });
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
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
      noneTag: false
    });
    
    // Reset sorting
    setSortField(null);
    setSortDirection('asc');
    
    setFilteredData(data);
    setDisplayData(data);
    setCopyBatch(0);
    setCopiedAll(false);
  };
  
  // Copy card codes to clipboard - updated to handle batches and remove copied cards
  const copyCardCodes = () => {
    const batchSize = 50;
    const totalBatches = Math.ceil(filteredData.length / batchSize);
    
    // If we've copied all batches, reset to beginning and restore display
    if (copyBatch >= totalBatches || copiedAll) {
      setCopyBatch(0);
      setCopiedAll(false);
      setDisplayData([...filteredData]);
      return;
    }
    
    const startIndex = copyBatch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, filteredData.length);
    const cardsToCopy = filteredData.slice(startIndex, endIndex);
    
    // Add prefix if it exists
    let codes;
    if (prefix.trim()) {
      codes = cardsToCopy.map(card => `${prefix} ${card.code}`).join(', ');
    } else {
      codes = cardsToCopy.map(card => card.code).join(', ');
    }
    
    navigator.clipboard.writeText(codes);
    alert(`Copied codes ${startIndex+1}-${endIndex} of ${filteredData.length}`)
    
    // Remove copied cards from display
    const newDisplayData = displayData.filter(card => 
      !cardsToCopy.some(copiedCard => copiedCard.code === card.code)
    );
    
    setDisplayData(newDisplayData);
    
    // Move to next batch
    setCopyBatch(copyBatch + 1);
    
    // If we've copied all, mark as completed
    if (endIndex >= filteredData.length) {
      setCopiedAll(true);
    }
  };
  
  // Download card codes as text file
  const downloadCardCodes = () => {
    const maxCodesPerLine = 50;
    let content = '';
    
    for (let i = 0; i < filteredData.length; i += maxCodesPerLine) {
      const batch = filteredData.slice(i, i + maxCodesPerLine);
      
      // Add prefix if it exists
      if (prefix.trim()) {
        content += prefix + ' ' + batch.map(card => card.code).join(', ') + '\n';
      } else {
        content += batch.map(card => card.code).join(', ') + '\n';
      }
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card_codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Get unique editions
  const getUniqueEditions = () => {
    if (data.length === 0) return [];
    
    const editions = [...new Set(data.map(card => card.edition))];
    return editions.sort((a, b) => parseInt(a) - parseInt(b));
  };
  
  // Get copy button text
  const getCopyButtonText = () => {
    const batchSize = 50;
    const totalBatches = Math.ceil(filteredData.length / batchSize);
    
    if (filteredData.length === 0) {
      return "Copy Codes (max 50)";
    }
    
    // If we've copied all batches or marked as copied all, show that we're starting over
    if (copyBatch >= totalBatches || copiedAll) {
      return "Restore & Start Over";
    }
    
    const startIndex = copyBatch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, filteredData.length);
    
    return `Copy Codes (${startIndex}/${filteredData.length})`;
  };
  
  return (
    <div className="container">
      {/* Theme Toggle Switch */}
      <div className="theme-switch-container">
        <span className="theme-icon">☀️</span>
        <label className="theme-switch">
          <input 
            type="checkbox" 
            checked={isDarkTheme}
            onChange={toggleTheme}
          />
          <span className="slider"></span>
        </label>
        <span className="theme-icon">🌙</span>
      </div>
      
      <h1 className="header">Card Filter Application</h1>
      
      {/* File upload */}
      <div className="card">
        <h2>Upload CSV File</h2>
        <input 
          type="file" 
          accept=".csv, .txt" 
          onChange={handleFileUpload} 
          className="mb-2"
        />
        {loading && <p>Loading data...</p>}
        {!loading && data.length > 0 && (
          <p className="text-success">Loaded {data.length} records.</p>
        )}
        {!loading && data.length === 0 && !file && (
          <p>No data loaded. Please upload a CSV or TXT file.</p>
        )}
        
        <div className="form-group">
          <label className="form-label">Prefix for card codes:</label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="form-input"
            placeholder="Enter prefix (e.g. 'kt t1')"
          />
          <p className="text-gray-500 text-sm mt-1">
            This text will be added before each card code when copying or downloading.
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="card">
        <h2>Filters</h2>
        <div className="form-group">
          <label className="form-label">Series:</label>
          <input
            type="text"
            name="series"
            value={filters.series}
            onChange={handleFilterChange}
            className="form-input"
            placeholder="Enter series name..."
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Number:</label>
          <div className="flex gap-2">
            <input
              type="number"
              name="numberFrom"
              value={filters.numberFrom}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="From"
            />
            <input
              type="number"
              name="numberTo"
              value={filters.numberTo}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="To"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Wishlists:</label>
          <div className="flex gap-2">
            <input
              type="number"
              name="wishlistsFrom"
              value={filters.wishlistsFrom}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="From"
            />
            <input
              type="number"
              name="wishlistsTo"
              value={filters.wishlistsTo}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="To"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Tag:</label>
          <div className="flex gap-2">
            <input
              type="text"
              name="tag"
              value={filters.tag}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Enter tag..."
              disabled={filters.noneTag}
            />
            <button
              onClick={() => setFilters({...filters, noneTag: !filters.noneTag, tag: filters.noneTag ? filters.tag : ''})}
              className={`btn ${filters.noneTag ? 'btn-primary' : 'btn-secondary'}`}
              title="Show only cards with no tag"
            >
              None Tag
            </button>
          </div>
          {filters.noneTag && (
            <p className="text-info" style={{fontSize: "0.75rem", marginTop: "0.25rem"}}>
              Showing only cards with no tag. Tag search is disabled.
            </p>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">Editions:</label>
          <div className="flex flex-wrap gap-2">
            {getUniqueEditions().map((edition) => (
              <button
                key={edition}
                onClick={() => handleEditionChange(edition)}
                className={`chip ${
                  filters.editions.includes(edition)
                    ? 'chip-blue'
                    : 'chip-gray'
                }`}
              >
                {edition}
              </button>
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <div className="flex flex-wrap gap-2">
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="morphed"
                name="morphed"
                checked={filters.morphed}
                onChange={handleFilterChange}
                className="checkbox"
              />
              <label htmlFor="morphed" className="checkbox-label">
                Morphed
              </label>
            </div>
            
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="trimmed"
                name="trimmed"
                checked={filters.trimmed}
                onChange={handleFilterChange}
                className="checkbox"
              />
              <label htmlFor="trimmed" className="checkbox-label">
                Trimmed
              </label>
            </div>
            
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="frame"
                name="frame"
                checked={filters.frame}
                onChange={handleFilterChange}
                className="checkbox"
              />
              <label htmlFor="frame" className="checkbox-label">
                With Frame
              </label>
            </div>
            
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="hasDyeName"
                name="hasDyeName"
                checked={filters.hasDyeName}
                onChange={handleFilterChange}
                className="checkbox"
              />
              <label htmlFor="hasDyeName" className="checkbox-label">
                With dye.name
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="btn btn-primary"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="btn btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      </div>
      
      {/* Results section */}
      <div className="card">
        <div className="flex" style={{justifyContent: "space-between", marginBottom: "1rem"}}>
          <h2>Results {data.length > 0 ? `(${displayData.length}/${filteredData.length})` : ""}</h2>
          <div className="flex gap-2">
            <button
              onClick={copyCardCodes}
              disabled={filteredData.length === 0}
              className={`btn ${
                filteredData.length === 0
                  ? 'btn-secondary'
                  : 'btn-success'
              }`}
            >
              {getCopyButtonText()}
            </button>
            <button
              onClick={downloadCardCodes}
              disabled={filteredData.length === 0}
              className={`btn ${
                filteredData.length === 0
                  ? 'btn-secondary'
                  : 'btn-purple'
              }`}
            >
              Download as .txt
            </button>
          </div>
        </div>
        
        {/* Results table */}
        {displayData.length > 0 ? (
          <div style={{overflowX: "auto", maxHeight: "500px", overflowY: "auto"}}>
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('code')} className="sortable-header">
                    Code {sortField === 'code' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('number')} className="sortable-header">
                    Number {sortField === 'number' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('edition')} className="sortable-header">
                    Edition {sortField === 'edition' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('character')} className="sortable-header">
                    Character {sortField === 'character' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('series')} className="sortable-header">
                    Series {sortField === 'series' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('quality')} className="sortable-header">
                    Quality {sortField === 'quality' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('wishlists')} className="sortable-header">
                    Wishlists {sortField === 'wishlists' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('frame')} className="sortable-header">
                    Frame {sortField === 'frame' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                  <th onClick={() => handleSort('tag')} className="sortable-header">
                    Tag {sortField === 'tag' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().map((card, index) => (
                  <tr key={index}>
                    <td style={{color: "#3b82f6", fontWeight: 500}}>{card.code}</td>
                    <td>{card.number}</td>
                    <td>{card.edition}</td>
                    <td>{card.character}</td>
                    <td>{card.series}</td>
                    <td>{card.quality}</td>
                    <td>{card.wishlists}</td>
                    <td>{card.frame || "—"}</td>
                    <td>{card.tag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{textAlign: "center", padding: "1rem"}}>
            {file ? "No results matching the filter criteria." : "No data loaded. Please upload a file to see results."}
          </p>
        )}
        
        {displayData.length > 100 && (
          <p style={{fontSize: "0.875rem", marginTop: "0.5rem"}}>Showing first 100 of {displayData.length} records.</p>
        )}
        
        {/* Pagination controls */}
        {displayData.length > 0 && (
          <div className="pagination-container" style={{marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem"}}>
            <button 
              onClick={goToFirstPage} 
              disabled={currentPage === 1}
              className={`btn ${currentPage === 1 ? 'btn-secondary' : 'btn-primary'}`}
              title="First Page"
            >
              &laquo;
            </button>
            <button 
              onClick={goToPreviousPage} 
              disabled={currentPage === 1}
              className={`btn ${currentPage === 1 ? 'btn-secondary' : 'btn-primary'}`}
              title="Previous Page"
            >
              &lsaquo;
            </button>
            
            <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
              <span>Page</span>
              <input 
                type="number" 
                min="1" 
                max={totalPages} 
                value={currentPage}
                onChange={handlePageInput}
                style={{width: "50px", textAlign: "center", padding: "0.25rem"}}
                className="form-input"
              />
              <span>of {totalPages}</span>
            </div>
            
            <button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages}
              className={`btn ${currentPage === totalPages ? 'btn-secondary' : 'btn-primary'}`}
              title="Next Page"
            >
              &rsaquo;
            </button>
            <button 
              onClick={goToLastPage} 
              disabled={currentPage === totalPages}
              className={`btn ${currentPage === totalPages ? 'btn-secondary' : 'btn-primary'}`}
              title="Last Page"
            >
              &raquo;
            </button>
            
            <div style={{marginLeft: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
              <span>Show</span>
              <select 
                value={itemsPerPage} 
                onChange={handleItemsPerPageChange}
                className="form-input"
                style={{padding: "0.25rem"}}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        )}
        
        {filteredData.length !== displayData.length && (
          <p style={{fontSize: "0.875rem", marginTop: "0.5rem", color: "#3b82f6"}}>
            Displaying only {displayData.length} of {filteredData.length} records (remaining have already been copied).
          </p>
        )}
      </div>
    </div>
  );
};

export default CardFilterApp;