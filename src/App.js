import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

const CardFilterApp = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
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
    tag: ''
  });
  
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
  
  // Load example data if no file is uploaded
  useEffect(() => {
    const loadExampleData = async () => {
      try {
        const response = await window.fs.readFile('paste.txt', { encoding: 'utf8' });
        Papa.parse(response, {
          header: true,
          complete: (results) => {
            setData(results.data);
            setFilteredData(results.data);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
          }
        });
      } catch (error) {
        console.error('Error loading example data:', error);
      }
    };
    
    if (!file) {
      loadExampleData();
    }
  }, [file]);
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFilters({
        ...filters,
        [name]: checked
      });
    } else {
      setFilters({
        ...filters,
        [name]: value
      });
    }
  };
  
  // Handle edition selection
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
  
  // Apply filters
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
    
    setFilteredData(results);
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
      tag: ''
    });
    
    setFilteredData(data);
  };
  
  // Copy card codes to clipboard
  const copyCardCodes = () => {
    const codes = filteredData.slice(0, 50).map(card => card.code).join(', ');
    navigator.clipboard.writeText(codes);
    alert('Card codes copied to clipboard!');
  };
  
  // Download card codes as text file
  const downloadCardCodes = () => {
    const maxCodesPerLine = 50;
    let content = '';
    
    for (let i = 0; i < filteredData.length; i += maxCodesPerLine) {
      const batch = filteredData.slice(i, i + maxCodesPerLine);
      content += batch.map(card => card.code).join(', ') + '\n';
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
  
  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">Card Filter Application</h1>
      
      {/* File upload */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Upload CSV File</h2>
        <input 
          type="file" 
          accept=".csv, .txt" 
          onChange={handleFileUpload} 
          className="mb-2 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {loading && <p className="text-gray-500">Loading data...</p>}
        {!loading && data.length > 0 && (
          <p className="text-green-600">Loaded {data.length} records.</p>
        )}
      </div>
      
      {/* Filters */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <h2 className="text-lg font-semibold mb-2 col-span-full">Filters</h2>
        
        {/* Series filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Series:
          </label>
          <input
            type="text"
            name="series"
            value={filters.series}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter series name..."
          />
        </div>
        
        {/* Number range */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number:
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              name="numberFrom"
              value={filters.numberFrom}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="From"
            />
            <input
              type="number"
              name="numberTo"
              value={filters.numberTo}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="To"
            />
          </div>
        </div>
        
        {/* Wishlists range */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wishlists:
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              name="wishlistsFrom"
              value={filters.wishlistsFrom}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="From"
            />
            <input
              type="number"
              name="wishlistsTo"
              value={filters.wishlistsTo}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="To"
            />
          </div>
        </div>
        
        {/* Tag filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tag:
          </label>
          <input
            type="text"
            name="tag"
            value={filters.tag}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter tag..."
          />
        </div>
        
        {/* Editions */}
        <div className="mb-4 col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Editions:
          </label>
          <div className="flex flex-wrap gap-2">
            {getUniqueEditions().map((edition) => (
              <button
                key={edition}
                onClick={() => handleEditionChange(edition)}
                className={`px-3 py-1 text-sm rounded-full ${
                  filters.editions.includes(edition)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {edition}
              </button>
            ))}
          </div>
        </div>
        
        {/* Checkboxes */}
        <div className="mb-4 col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="morphed"
              name="morphed"
              checked={filters.morphed}
              onChange={handleFilterChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="morphed" className="ml-2 text-sm text-gray-700">
              Morphed
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="trimmed"
              name="trimmed"
              checked={filters.trimmed}
              onChange={handleFilterChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="trimmed" className="ml-2 text-sm text-gray-700">
              Trimmed
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="frame"
              name="frame"
              checked={filters.frame}
              onChange={handleFilterChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="frame" className="ml-2 text-sm text-gray-700">
              With Frame
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasDyeName"
              name="hasDyeName"
              checked={filters.hasDyeName}
              onChange={handleFilterChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="hasDyeName" className="ml-2 text-sm text-gray-700">
              With dye.name
            </label>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="col-span-full flex gap-2">
          <button
            onClick={applyFilters}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md"
          >
            Reset Filters
          </button>
        </div>
      </div>
      
      {/* Results section */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Results ({filteredData.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={copyCardCodes}
              disabled={filteredData.length === 0}
              className={`py-2 px-4 rounded-md ${
                filteredData.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              Copy Codes (max 50)
            </button>
            <button
              onClick={downloadCardCodes}
              disabled={filteredData.length === 0}
              className={`py-2 px-4 rounded-md ${
                filteredData.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              Download as .txt
            </button>
          </div>
        </div>
        
        {/* Results table */}
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Edition
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Character
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Series
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wishlists
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tag
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.slice(0, 100).map((card, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {card.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.edition}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.character}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.series}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.quality}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.wishlists}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.tag}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No results matching the filter criteria.</p>
        )}
        
        {filteredData.length > 100 && (
          <p className="text-gray-500 text-sm mt-2">Showing first 100 of {filteredData.length} records.</p>
        )}
      </div>
    </div>
  );
};

export default CardFilterApp;