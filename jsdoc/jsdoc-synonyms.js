/*
jsdoc-synonyms.js - Add support for @synonym tag
Copyright (C) 2023 Strudel contributors - see <https://github.com/tidalcycles/strudel/blob/main/packages/midi/midi.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

function defineTags(dictionary) {
  dictionary.defineTag('synonyms', {
    mustHaveValue: true,
    onTagged: function (doclet, tag) {
      doclet.synonyms_text = tag.value;
      doclet.synonyms = doclet.synonyms_text.split(/[ ,]+/);
    },
  });
}

module.exports = { defineTags: defineTags };
