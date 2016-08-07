import concat from 'unique-concat';
import glob from 'glob';
import path from 'path';

export default class GlobImporter {
  /**
   * Synchronously resolve the path to a node-sass import url.
   * @param {string} url - Import url from node-sass.
   * @param {Array} includePaths - Paths to consider for importing files.
   * @return {Array} Fully resolved import urls or null.
   */
  resolveSync(url, includePaths = [process.cwd()]) {
    if (glob.hasMagic(url)) {
      const absolutePaths = includePaths.reduce((absolutePathStore, includePath) => {
        // Try to resolve the glob pattern.
        const newAbsolutePaths = glob
          .sync(url, { cwd: includePath })
          .map(relativePath => path.resolve(includePath, relativePath));
        // Merge new paths with previously found ones.
        return concat(absolutePathStore, newAbsolutePaths);
      }, []);
      if (absolutePaths.length) {
        return absolutePaths;
      }
    }
    return null;
  }

  /**
   * Asynchronously resolve the path to a node-sass import url.
   * @param {string} url - Import url from node-sass.
   * @param {Array} includePaths - Paths to consider for importing files.
   * @return {Promise} Promise for an array of fully resolved import urls.
   */
  resolve(url, includePaths = [process.cwd()]) {
    return new Promise((promiseResolve) => {
      promiseResolve(this.resolveSync(url, includePaths));
    });
  }

  /**
   * @return {function} Returns a node-sass importer function.
   */
  importer() {
    const self = this;
    return function nodeSassImporter(url, prev, done) {
      const importer = this;
      // Create a set of all paths to search for files.
      let includePaths = [];
      if (path.isAbsolute(prev)) {
        includePaths.push(path.dirname(prev));
      }
      includePaths = concat(includePaths, importer.options.includePaths.split(path.delimiter));
      // Try to resolve the url.
      self.resolve(url, includePaths).then(files => {
        if (files) {
          const contents = files.map(x => `@import '${x}';`).join('\n');
          done({ contents });
        } else {
          done(null);
        }
      });
    };
  }
}
