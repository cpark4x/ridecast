/**
 * Jest stub for CSS/stylesheet imports (e.g. global.css, tailwind css).
 * These files can't be parsed by Jest's JS transformer — map them to an empty
 * module via moduleNameMapper in jest config.
 */
module.exports = {};
