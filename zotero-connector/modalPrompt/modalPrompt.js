function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2018 Center for History and New Media
					George Mason University, Fairfax, Virginia, USA
					http://zotero.org
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/
window.onload = async function () {
  Zotero.Messaging.addMessageListener('modalPrompt.show', async function (props) {
    var deferred = Zotero.Promise.defer();
    let div = document.querySelector('#zotero-modal-prompt');
    let prompt = React.createElement(Zotero.UI.ModalPrompt, _extends({
      onClose: onClose
    }, props));

    function onClose(state, event) {
      deferred.resolve({
        button: event ? parseInt(event.target.name || 0) : 0,
        checkboxChecked: state.checkboxChecked,
        inputText: state.inputText
      });
      ReactDOM.unmountComponentAtNode(div);
    }

    ReactDOM.render(prompt, div);
    document.body.appendChild(div);
    return await deferred.promise;
  }); // To enable testing with mocha

  Zotero.isInject = true;
  Zotero.initDeferred.resolve();
  await Zotero.Messaging.init();
  Zotero.Messaging.sendMessage('modalPrompt.init', null);
};