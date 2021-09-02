/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2017 Center for History and New Media
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
var Zotero_Preferences_Config = {
  init: function () {
    Zotero.Messaging.init();
    Zotero.Prefs.getAll().then(function (prefs) {
      this.table = React.createElement(Zotero_Preferences_Config.Table, {
        prefs: prefs
      });
      ReactDOM.render(this.table, document.getElementById('table'));
    }.bind(this));
  }
};
Zotero_Preferences_Config.Table = class Table extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      prefs: Object.keys(this.props.prefs)
    };
    this.filter = this.filter.bind(this);
    this.addPref = this.addPref.bind(this);
  }

  filter(event) {
    this.setState({
      filter: event.target.value
    });
  }

  addPref() {
    let name = prompt('Enter the preference name');
    if (name === null) return;
    let value = prompt('Enter the preference value');
    if (value === null) return;

    try {
      var parsedValue = JSON.parse(value);
    } catch (e) {
      parsedValue = value;
    }

    Zotero.Prefs.set(name, parsedValue);
    this.setState(state => ({
      prefs: state.prefs.concat([name])
    }));
  }

  resetPref(name) {
    if (confirm('Do you want to reset this preference to its default value?')) {
      Zotero.Prefs.clear(name);
      Zotero.Prefs.getAsync(name).then(() => this.forceUpdate()).catch(function (e) {
        this.setState(state => ({
          prefs: state.prefs.filter(p => p != name)
        }));
      }.bind(this));
    }
  }

  render() {
    let rows = [];
    let keys = [...this.state.prefs];
    keys.sort();

    if (this.state.filter.length) {
      keys = keys.filter(k => k.includes(this.state.filter));
    }

    for (let key of keys) {
      rows.push(React.createElement(Zotero_Preferences_Config.Row, {
        name: key,
        key: key,
        reset: this.resetPref.bind(this, key)
      }));
    }

    return React.createElement("div", null, React.createElement("div", {
      style: {
        display: "flex"
      }
    }, React.createElement("input", {
      className: "form-control",
      type: "search",
      placeholder: "Filter",
      onChange: this.filter
    }), React.createElement("a", {
      style: {
        alignSelf: 'center'
      },
      href: "javascript:void(0);",
      onClick: this.addPref
    }, "Add Preference")), React.createElement("table", {
      className: "table table-hover"
    }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
      width: "25%"
    }, "Preference"), React.createElement("th", null, "Value"), React.createElement("th", {
      width: "110px"
    }))), React.createElement("tbody", null, rows)));
  }

};
Zotero_Preferences_Config.Row = class Row extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.edit = this.edit.bind(this);
  }

  edit() {
    Zotero.Prefs.getAsync(this.props.name).then(function (value) {
      if (typeof value == 'object') value = JSON.stringify(value);

      if (typeof value == 'boolean') {
        value = `${!value}`;
      } else {
        value = window.prompt('', value);
        if (value === null) return;
      }

      try {
        var parsedValue = JSON.parse(value);
      } catch (e) {
        parsedValue = value;
      }

      Zotero.Prefs.set(this.props.name, parsedValue);
      this.setState({
        value
      });
    }.bind(this));
  }

  componentDidMount() {
    Zotero.Prefs.getAsync(this.props.name).then(function (value) {
      if (typeof value != 'string') {
        value = JSON.stringify(value);
      }

      this.setState({
        value
      });
    }.bind(this));
  }

  componentDidUpdate() {
    Zotero.Prefs.getAsync(this.props.name).then(function (value) {
      if (typeof value != 'string') {
        value = JSON.stringify(value);
      }

      if (value == this.state.value) return;
      this.setState({
        value
      });
    }.bind(this));
  }

  render() {
    return React.createElement("tr", {
      onDoubleClick: this.edit,
      "data-name": this.props.name,
      className: "config-row"
    }, React.createElement("td", null, this.props.name), React.createElement("td", null, this.state.value), React.createElement("td", null, React.createElement("a", {
      href: "javascript:void(0);",
      onClick: this.props.reset
    }, "Reset")));
  }

};
Zotero_Preferences_Config.init();