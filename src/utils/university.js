const fs = require('fs');
const path = require('path');

let universities = [];

try {
  const jsonPath = path.resolve(__dirname, '../data/unv_ready.json');
  const fileContent = fs.readFileSync(jsonPath, 'utf8');
  universities = JSON.parse(fileContent);
} catch (err) {
  console.error('Failed to load universities JSON:', err);
}

/**
 * Get all universities
 * @returns {Array<{id: number, name: string}>}
 */
function getUniversities() {
  return universities;
}

/**
 * Find university by ID
 * @param {number|string} id - University ID
 * @returns {{id: number, name: string}|null}
 */
function getUniversityById(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;
  return universities.find((u) => u.id === numericId) || null;
}

module.exports = {
  getUniversities,
  getUniversityById,
};
