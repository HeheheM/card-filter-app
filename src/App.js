import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import './styles.css';

const CardFilterApp = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copyBatch, setCopyBatch] = useState(0);
  const [singleCopyIndex, setSingleCopyIndex] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [singleCopiedAll, setSingleCopiedAll] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Default to dark theme
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10 items per page
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [csvUrl, setCsvUrl] = useState('');
  const [inputMethod, setInputMethod] = useState('file'); // 'file' or 'url'
  const [urlError, setUrlError] = useState('');
  const [filters, setFilters] = useState({
    codes: '', // New field for card codes search
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
    // Blacklist filters
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
  const [codesDisplayFormat, setCodesDisplayFormat] = useState('50per'); // '50per' or '1per'
  
  // Calculate the total number of pages
  const totalPages = Math.ceil(displayData.length / itemsPerPage);
  
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
      if (['number', 'wishlists', 'edition', 'worker.effort'].includes(sortField)) {
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
  };
  
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
    // Apply theme class to document
    applyTheme(isDarkTheme);
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
  };
  
  // Handle file upload
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    
    if (uploadedFile) {
      setLoading(true);
      setUrlError('');
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
  
  // Handle URL input
  const handleUrlLoad = async () => {
    if (!csvUrl.trim()) {
      setUrlError('Please enter a URL');
      return;
    }
    
    // Check if URL ends with .csv
    if (!csvUrl.toLowerCase().endsWith('.csv')) {
      setUrlError('URL must point to a .csv file');
      return;
    }
    
    setLoading(true);
    setUrlError('');
    setFile(null);
    
    try {
      console.log('Loading CSV via proxy...');
      
      // Use working proxy directly
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(csvUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvContent = await response.text();
      
      // Check if content looks like CSV
      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('Empty file or invalid CSV content');
      }
      
      // Check if it's actually CSV data (not an error page)
      if (csvContent.includes('<html>') || csvContent.includes('<!DOCTYPE')) {
        throw new Error('Received HTML instead of CSV data');
      }
      
      Papa.parse(csvContent, {
        header: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          
          if (!results.data || results.data.length === 0) {
            setUrlError('No data found in CSV file');
            setLoading(false);
            return;
          }
          
          setData(results.data);
          setFilteredData(results.data);
          setDisplayData(results.data);
          setLoading(false);
          console.log('✅ CSV loaded successfully!');
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setUrlError('Error parsing CSV file - please check if the file format is correct');
          setLoading(false);
        }
      });
      
    } catch (error) {
      console.error('❌ Error loading CSV:', error.message);
      setUrlError(`❌ Unable to load CSV from URL: ${error.message}\n\n✅ Please try:\n1. Check if the URL is correct and accessible\n2. Download the file directly and use "Upload File"`);
      setLoading(false);
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
    
    // Filter by card codes (if specified)
    if (filters.codes.trim()) {
      const searchCodes = filters.codes.toLowerCase().split(',').map(code => code.trim()).filter(code => code.length > 0);
      const foundCodes = [];
      const notFound = [];
      
      // Find cards that match the specified codes
      const codeResults = [];
      searchCodes.forEach(searchCode => {
        const matchingCards = data.filter(card => card.code.toLowerCase() === searchCode);
        if (matchingCards.length > 0) {
          codeResults.push(...matchingCards);
          foundCodes.push(searchCode);
        } else {
          notFound.push(searchCode);
        }
      });
      
      results = codeResults;
      setNotFoundCodes(notFound);
    } else {
      setNotFoundCodes([]);
    }
    
    // If codes filter is active, skip other filters (codes take priority)
    if (!filters.codes.trim()) {
      // Filter by series
      if (filters.series) {
        // Allow multiple series names separated by commas
        const includedSeries = filters.series.toLowerCase().split(',').map(s => s.trim());
        results = results.filter(card => {
          const cardSeries = card.series.toLowerCase();
          return includedSeries.some(series => cardSeries.includes(series));
        });
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
      
      // Apply blacklist filters
      
      // Blacklist series filter
      if (filters.blacklistSeries) {
        // Allow multiple series names separated by commas
        const blacklistedSeries = filters.blacklistSeries.toLowerCase().split(',').map(s => s.trim());
        results = results.filter(card => {
          const cardSeries = card.series.toLowerCase();
          return !blacklistedSeries.some(series => cardSeries.includes(series));
        });
      }
      
      // Blacklist character filter
      if (filters.blacklistCharacter) {
        // Allow multiple character names separated by commas
        const blacklistedCharacters = filters.blacklistCharacter.toLowerCase().split(',').map(c => c.trim());
        results = results.filter(card => {
          const cardCharacter = card.character.toLowerCase();
          return !blacklistedCharacters.some(character => cardCharacter.includes(character));
        });
      }
      
      // Blacklist tag filter
      if (filters.blacklistTag) {
        // Allow multiple tags separated by commas
        const blacklistedTags = filters.blacklistTag.toLowerCase().split(',').map(t => t.trim());
        results = results.filter(card => {
          const cardTag = (card.tag || '').toLowerCase();
          return !blacklistedTags.some(tag => cardTag.includes(tag));
        });
      }
      
      // Exclude cards with frame
      if (filters.excludeFrame) {
        results = results.filter(card => !card.frame || card.frame.trim() === '');
      }
      
      // Exclude morphed cards
      if (filters.excludeMorphed) {
        results = results.filter(card => card.morphed !== "Yes");
      }
      
      // Exclude trimmed cards
      if (filters.excludeTrimmed) {
        results = results.filter(card => card.trimmed !== "Yes");
      }
      
      // Exclude cards with dye.name
      if (filters.excludeDyeName) {
        results = results.filter(card => !card["dye.name"] || card["dye.name"].trim() === '');
      }
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
      codes: '', // Reset codes filter
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
      // Reset blacklist filters
      blacklistSeries: '',
      blacklistCharacter: '',
      blacklistTag: '',
      excludeFrame: false,
      excludeMorphed: false,
      excludeTrimmed: false,
      excludeDyeName: false
    });
    
    // Reset sorting
    setSortField(null);
    setSortDirection('asc');
    
    // Clear not found codes
    setNotFoundCodes([]);
    
    setFilteredData(data);
    setDisplayData(data);
    setCopyBatch(0);
    setCopiedAll(false);
    setSingleCopyIndex(0);
    setSingleCopiedAll(false);
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

  // Copy card codes to clipboard (one card at a time)
  const copyCardCodesOneLine = () => {
    // If we've copied all cards, reset to beginning and restore display
    if (filteredData.length === 0 || singleCopyIndex >= filteredData.length || singleCopiedAll) {
      setSingleCopyIndex(0);
      setSingleCopiedAll(false);
      setDisplayData([...filteredData]);
      return;
    }
    
    // Get the single card to copy
    const cardToCopy = filteredData[singleCopyIndex];
    
    // Add prefix if it exists, for a single code
    let code;
    if (prefix.trim()) {
      code = `${prefix} ${cardToCopy.code}`;
    } else {
      code = cardToCopy.code;
    }
    
    navigator.clipboard.writeText(code);
    alert(`Copied code ${singleCopyIndex+1} of ${filteredData.length}: ${cardToCopy.code}`);
    
    // Remove only this copied card from display
    const newDisplayData = displayData.filter(card => card.code !== cardToCopy.code);
    setDisplayData(newDisplayData);
    
    // Move to next card
    setSingleCopyIndex(singleCopyIndex + 1);
    
    // If we've copied all, mark as completed
    if (singleCopyIndex + 1 >= filteredData.length) {
      setSingleCopiedAll(true);
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

  // Download card codes as text file (one per line)
  const downloadCardCodesOneLine = () => {
    let content = '';
    
    // Add prefix if it exists, one code per line
    if (prefix.trim()) {
      content = filteredData.map(card => `${prefix} ${card.code}`).join('\n');
    } else {
      content = filteredData.map(card => card.code).join('\n');
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card_codes_one_per_line.txt';
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
  
  // Get single copy button text
  const getSingleCopyButtonText = () => {
    if (filteredData.length === 0) {
      return "Copy Single Code";
    }
    
    // If we've copied all cards or marked as single copied all, show that we're starting over
    if (singleCopyIndex >= filteredData.length || singleCopiedAll) {
      return "Restore & Start Over";
    }
    
    return `Copy Single Code (${singleCopyIndex}/${filteredData.length})`;
  };
  
  // Generate codes for display in modal
  const generateCodesForDisplay = () => {
    if (filteredData.length === 0) return '';
    
    if (codesDisplayFormat === '50per') {
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
      
      return content.trim();
    } else {
      // 1 per line format
      if (prefix.trim()) {
        return filteredData.map(card => `${prefix} ${card.code}`).join('\n');
      } else {
        return filteredData.map(card => card.code).join('\n');
      }
    }
  };
  
  // Copy codes from modal to clipboard
  const copyCodesFromModal = () => {
    const codes = generateCodesForDisplay();
    navigator.clipboard.writeText(codes);
    alert(`Copied ${filteredData.length} codes to clipboard!`);
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
        <h2>Load CSV Data</h2>
        
        {/* Input method selection */}
        <div className="form-group">
          <label className="form-label">Choose input method:</label>
          <div className="flex gap-4">
            <div className="checkbox-container">
              <input
                type="radio"
                id="file-method"
                name="input-method"
                checked={inputMethod === 'file'}
                onChange={() => {
                  setInputMethod('file');
                  setCsvUrl('');
                  setUrlError('');
                }}
                className="checkbox"
              />
              <label htmlFor="file-method" className="checkbox-label">
                Upload File
              </label>
            </div>
            
            <div className="checkbox-container">
              <input
                type="radio"
                id="url-method"
                name="input-method"
                checked={inputMethod === 'url'}
                onChange={() => {
                  setInputMethod('url');
                  setFile(null);
                }}
                className="checkbox"
              />
              <label htmlFor="url-method" className="checkbox-label">
                Load from URL
              </label>
            </div>
          </div>
        </div>
        
        {/* File upload section */}
        {inputMethod === 'file' && (
          <div className="form-group">
            <label className="form-label">Select CSV or TXT file:</label>
            <input 
              type="file" 
              accept=".csv, .txt" 
              onChange={handleFileUpload} 
              className="form-input"
            />
          </div>
        )}
        
        {/* URL input section */}
        {inputMethod === 'url' && (
          <div className="form-group">
            <label className="form-label">CSV file URL:</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={csvUrl}
                onChange={(e) => setCsvUrl(e.target.value)}
                className="form-input"
                placeholder="https://example.com/file.csv"
                style={{flex: 1}}
              />
              <button
                onClick={handleUrlLoad}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Loading...' : 'Load CSV'}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Enter a direct link to a CSV file. The URL must end with .csv
            </p>
            {urlError && (
              <div className="url-error">
                <p className="text-error">
                  {urlError}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Loading and status messages */}
        {loading && <p>Loading data...</p>}
        {!loading && data.length > 0 && (
          <p className="text-success">Loaded {data.length} records.</p>
        )}
        {!loading && data.length === 0 && !file && !csvUrl && (
          <p>No data loaded. Please upload a CSV/TXT file or provide a CSV URL.</p>
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
      
      {/* Filters card */}
      <div className="card">
        <h2>Filters</h2>
        
        {/* Include filters section */}
        <div className="filter-section">
          <h3 className="filter-section-title">Include Filters</h3>
          
          <div className="form-group">
            <label className="form-label">Search by Card Codes:</label>
            <input
              type="text"
              name="codes"
              value={filters.codes}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Enter card codes separated by commas (e.g., vpvh96n, vzgrgsx)"
            />
            <p className="text-gray-500 text-sm mt-1">
              Search for specific cards by their codes. This will override other filters when used.
            </p>
            {notFoundCodes.length > 0 && (
              <div className="not-found-codes">
                <p className="text-warning">
                  <strong>Not found codes:</strong> {notFoundCodes.join(', ')}
                </p>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Series:</label>
            <input
              type="text"
              name="series"
              value={filters.series}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Enter series names (comma-separated)"
              disabled={filters.codes.trim() !== ''}
            />
            {filters.series && filters.series.includes(',') && !filters.codes.trim() && (
              <p className="text-info text-sm mt-1">
                Including series containing: {filters.series}
              </p>
            )}
            {filters.codes.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                Disabled while using code search
              </p>
            )}
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
                disabled={filters.codes.trim() !== ''}
              />
              <input
                type="number"
                name="numberTo"
                value={filters.numberTo}
                onChange={handleFilterChange}
                className="form-input"
                placeholder="To"
                disabled={filters.codes.trim() !== ''}
              />
            </div>
            {filters.codes.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                Disabled while using code search
              </p>
            )}
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
                disabled={filters.codes.trim() !== ''}
              />
              <input
                type="number"
                name="wishlistsTo"
                value={filters.wishlistsTo}
                onChange={handleFilterChange}
                className="form-input"
                placeholder="To"
                disabled={filters.codes.trim() !== ''}
              />
            </div>
            {filters.codes.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                Disabled while using code search
              </p>
            )}
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
                disabled={filters.noneTag || filters.codes.trim() !== ''}
              />
              <button
                onClick={() => setFilters({...filters, noneTag: !filters.noneTag, tag: filters.noneTag ? filters.tag : ''})}
                className={`btn ${filters.noneTag ? 'btn-primary' : 'btn-secondary'}`}
                title="Show only cards with no tag"
                disabled={filters.codes.trim() !== ''}
              >
                None Tag
              </button>
            </div>
            {filters.noneTag && !filters.codes.trim() && (
              <p className="text-info text-sm mt-1">
                Showing only cards with no tag. Tag search is disabled.
              </p>
            )}
            {filters.codes.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                Disabled while using code search
              </p>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Editions:</label>
            <div className="flex flex-wrap gap-2">
              {getUniqueEditions().map((edition) => (
                <button
                  key={edition}
                  onClick={() => !filters.codes.trim() && handleEditionChange(edition)}
                  className={`chip ${
                    filters.editions.includes(edition)
                      ? 'chip-blue'
                      : 'chip-gray'
                  } ${filters.codes.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={filters.codes.trim() !== ''}
                >
                  {edition}
                </button>
              ))}
            </div>
            {filters.codes.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                Disabled while using code search
              </p>
            )}
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
                  disabled={filters.codes.trim() !== ''}
                />
                <label htmlFor="morphed" className={`checkbox-label ${filters.codes.trim() ? 'opacity-50' : ''}`}>
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
                  disabled={filters.codes.trim() !== ''}
                />
                <label htmlFor="trimmed" className={`checkbox-label ${filters.codes.trim() ? 'opacity-50' : ''}`}>
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
                  disabled={filters.codes.trim() !== ''}
                />
                <label htmlFor="frame" className={`checkbox-label ${filters.codes.trim() ? 'opacity-50' : ''}`}>
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
                  disabled={filters.codes.trim() !== ''}
                />
                <label htmlFor="hasDyeName" className={`checkbox-label ${filters.codes.trim() ? 'opacity-50' : ''}`}>
                  With dye.name
                </label>
              </div>
            </div>
            {filters.codes.trim() && (
              <p className="text-gray-500 text-sm mt-1">
                Disabled while using code search
              </p>
            )}
          </div>
          
          <div className="flex gap-2 mt-4">
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
        
        <div className="filter-section-divider"></div>
        
        {/* Exclude filters section */}
        <div className="filter-section">
          <h3 className="filter-section-title">Exclude Filters (Blacklist)</h3>
          
          <div className="form-group">
            <label className="form-label">Exclude Series:</label>
            <input
              type="text"
              name="blacklistSeries"
              value={filters.blacklistSeries}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Enter series to exclude (comma-separated)"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Exclude Characters:</label>
            <input
              type="text"
              name="blacklistCharacter"
              value={filters.blacklistCharacter}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Enter characters to exclude (comma-separated)"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Exclude Tags:</label>
            <input
              type="text"
              name="blacklistTag"
              value={filters.blacklistTag}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Enter tags to exclude (comma-separated)"
            />
          </div>
          
          <div className="form-group">
            <div className="flex flex-wrap gap-2">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="excludeFrame"
                  name="excludeFrame"
                  checked={filters.excludeFrame}
                  onChange={handleFilterChange}
                  className="checkbox"
                />
                <label htmlFor="excludeFrame" className="checkbox-label">
                  Exclude Cards with Frame
                </label>
              </div>
              
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="excludeMorphed"
                  name="excludeMorphed"
                  checked={filters.excludeMorphed}
                  onChange={handleFilterChange}
                  className="checkbox"
                />
                <label htmlFor="excludeMorphed" className="checkbox-label">
                  Exclude Morphed Cards
                </label>
              </div>
              
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="excludeTrimmed"
                  name="excludeTrimmed"
                  checked={filters.excludeTrimmed}
                  onChange={handleFilterChange}
                  className="checkbox"
                />
                <label htmlFor="excludeTrimmed" className="checkbox-label">
                  Exclude Trimmed Cards
                </label>
              </div>
              
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="excludeDyeName"
                  name="excludeDyeName"
                  checked={filters.excludeDyeName}
                  onChange={handleFilterChange}
                  className="checkbox"
                />
                <label htmlFor="excludeDyeName" className="checkbox-label">
                  Exclude Cards with dye.name
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
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
      </div>
      
      {/* Results section */}
      <div className="card">
        <div className="results-header">
          <h2>Results {data.length > 0 ? `(${displayData.length}/${filteredData.length})` : ""}</h2>
          <div className="results-actions">
            <button
              onClick={copyCardCodes}
              disabled={filteredData.length === 0}
              className={`btn ${
                filteredData.length === 0
                  ? 'btn-secondary'
                  : 'btn-success'
              }`}
              title="Copy up to 50 codes separated by commas"
            >
              <span className="btn-text-full">{getCopyButtonText()}</span>
              <span className="btn-text-short">Copy 50</span>
            </button>
            <button
              onClick={copyCardCodesOneLine}
              disabled={filteredData.length === 0}
              className={`btn ${
                filteredData.length === 0
                  ? 'btn-secondary'
                  : 'btn-success'
              }`}
              title="Copy a single code at a time"
            >
              <span className="btn-text-full">{getSingleCopyButtonText()}</span>
              <span className="btn-text-short">Copy 1</span>
            </button>
            <button
              onClick={downloadCardCodes}
              disabled={filteredData.length === 0}
              className={`btn ${
                filteredData.length === 0
                  ? 'btn-secondary'
                  : 'btn-purple'
              }`}
              title="Download with up to 50 codes per line"
            >
              <span className="btn-text-full">Download (50 max)</span>
              <span className="btn-text-short">DL 50</span>
            </button>
            <button
              onClick={downloadCardCodesOneLine}
              disabled={filteredData.length === 0}
              className={`btn ${
                filteredData.length === 0
                  ? 'btn-secondary'
                  : 'btn-purple'
              }`}
              title="Download with one code per line"
            >
              <span className="btn-text-full">Download (1 per line)</span>
              <span className="btn-text-short">DL 1</span>
            </button>
            <button
              onClick={() => setShowCodesModal(true)}
              disabled={filteredData.length === 0}
              className={`btn ${
                filteredData.length === 0
                  ? 'btn-secondary'
                  : 'btn-info'
              }`}
              title="Show codes in a modal window"
            >
              <span className="btn-text-full">Show Codes</span>
              <span className="btn-text-short">Show</span>
            </button>
          </div>
        </div>
        
        {/* Results table */}
        {displayData.length > 0 ? (
          <div className="table-container">
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
                  <th onClick={() => handleSort('worker.effort')} className="sortable-header">
                    Worker Effort {sortField === 'worker.effort' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
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
                    <td className="code-cell">{card.code}</td>
                    <td>{card.number}</td>
                    <td>{card.edition}</td>
                    <td>{card.character}</td>
                    <td>{card.series}</td>
                    <td>{card.quality}</td>
                    <td>{card.wishlists}</td>
                    <td>{card['worker.effort'] || "0"}</td>
                    <td>{card.frame || "—"}</td>
                    <td>{card.tag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-results">
            {file ? "No results matching the filter criteria." : "No data loaded. Please upload a file to see results."}
          </p>
        )}
        
        {/* Pagination controls */}
        {displayData.length > 0 && (
          <div className="pagination-container">
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
            
            <div className="page-info">
              <span>Page</span>
              <input 
                type="number" 
                min="1" 
                max={totalPages} 
                value={currentPage}
                onChange={handlePageInput}
                className="page-input form-input"
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
            
            <div className="items-per-page">
              <span>Show</span>
              <select 
                value={itemsPerPage} 
                onChange={handleItemsPerPageChange}
                className="items-select form-input"
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
          <p className="remaining-info">
            Displaying only {displayData.length} of {filteredData.length} records (remaining have already been copied).
          </p>
        )}
      </div>
      
      {/* Show Codes Modal */}
      {showCodesModal && (
        <div className="modal-overlay" onClick={() => setShowCodesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Card Codes ({filteredData.length} total)</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCodesModal(false)}
                title="Close modal"
              >
                ×
              </button>
            </div>
            
            <div className="modal-controls">
              <div className="modal-format-toggle">
                <button
                  onClick={() => setCodesDisplayFormat('50per')}
                  className={`btn ${codesDisplayFormat === '50per' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  50 per line
                </button>
                <button
                  onClick={() => setCodesDisplayFormat('1per')}
                  className={`btn ${codesDisplayFormat === '1per' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  1 per line
                </button>
              </div>
              
              <button
                onClick={copyCodesFromModal}
                className="btn btn-success"
                title="Copy all codes to clipboard"
              >
                Copy All
              </button>
            </div>
            
            <div className="modal-body">
              <textarea
                className="codes-textarea"
                value={generateCodesForDisplay()}
                readOnly
                rows={15}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardFilterApp;