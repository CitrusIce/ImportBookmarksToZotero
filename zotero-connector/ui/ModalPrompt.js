/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016 Center for History and New Media
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
window.Zotero = window.Zotero || {};
Zotero.UI = Zotero.UI || {};
/**
 * Displays a prompt which is overlaid over the screen.
 */

Zotero.UI.ModalPrompt = class ModalPrompt extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkboxChecked: this.props.checkboxChecked || false,
      checkboxBlocked: this.props.checkboxBlock && !this.props.checkboxChecked || false,
      onButton: this.props.onButton || this.props.onClose,
      inputText: this.props.inputText || ""
    };
    this.escListener = this.escListener.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.onCheckboxChange = this.onCheckboxChange.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keyup', this.escListener);
    setTimeout(() => this.refs.button1.focus());
  }

  componentWillUnmount() {
    document.removeEventListener('keyup', this.escListener);
  } // With synthetic React events you cannot stop event propagation


  attachButtonListeners() {
    window.requestAnimationFrame(function () {
      for (let a of document.querySelectorAll('.ModalPrompt-buttons input[type=button]')) {
        a.addEventListener('click', event => {
          event.stopPropagation();
          this.state.onButton(this.state, event);
        }, false);
      }
    }.bind(this));
  }

  escListener(event) {
    if (event.key == "Escape") {
      this.props.onClose(this.state);
      event.preventDefault();
    }
  }

  onCheckboxChange() {
    this.setState({
      checkboxChecked: !this.state.checkboxChecked,
      checkboxBlocked: this.props.checkboxBlock && this.state.checkboxChecked
    });
  }

  onInputChange(event) {
    this.setState({
      inputText: event.value
    });
  }

  render() {
    var checkbox,
        input,
        buttons = ["", "", ""];
    checkbox = input = "";

    if (this.props.checkbox) {
      checkbox = React.createElement("p", {
        className: "checkbox"
      }, React.createElement("label", {
        style: {
          fontWeight: "initial",
          lineHeight: "18px"
        }
      }, React.createElement("input", {
        type: "checkbox",
        style: {
          margin: "3px 7px 3px 3px"
        },
        checked: this.state.checkboxChecked,
        onChange: this.onCheckboxChange
      }), this.props.checkboxText));
    }

    if (this.props.input) {
      input = React.createElement("p", {
        className: "input"
      }, React.createElement("label", null, React.createElement("input", {
        value: this.state.inputText,
        placeholder: this.state.inputPlaceholder,
        onChange: this.onInputChange
      })));
    }

    for (let i = 1; i <= 3; i++) {
      if (this.props[`button${i}Text`].length) {
        buttons[i - 1] = React.createElement("input", {
          type: "button",
          name: i,
          value: this.props[`button${i}Text`],
          disabled: i == 1 && this.state.checkboxBlocked,
          ref: `button${i}`,
          className: "ModalPrompt-button"
        });
      }
    }

    this.attachButtonListeners();

    let onClickOutside = e => {
      e.stopPropagation();

      if (this.props.clickOutsideToClose && e.target.classList.contains('z-modal-overlay')) {
        this.props.onClose(this.state, e);
      }
    };

    let message = this.props.children || this.props.message;

    if (typeof message == "string") {
      message = React.createElement("span", {
        dangerouslySetInnerHTML: {
          __html: message
        }
      });
    }

    return React.createElement("div", {
      className: "ModalPrompt-overlay",
      onClick: onClickOutside
    }, React.createElement("div", {
      className: "ModalPrompt"
    }, React.createElement("h2", {
      className: "ModalPrompt-title"
    }, this.props.title), React.createElement("p", {
      className: "ModalPrompt-body"
    }, message), checkbox, input, React.createElement("div", {
      className: "ModalPrompt-buttons"
    }, buttons[2], React.createElement("span", {
      style: {
        flexGrow: 1
      }
    }), buttons[1], buttons[0])));
  }

};
Zotero.UI.ModalPrompt.defaultProps = {
  title: "Zotero Connector",
  checkbox: false,
  checkboxText: "",
  checkboxBlock: false,
  input: false,
  inputPlaceholder: "",
  button1Text: "OK",
  button2Text: "Cancel",
  button3Text: "",
  clickOutsideToClose: false
};
Zotero.UI.ModalPrompt.PropTypes = {
  title: PropTypes.string,

  /**
   * Show/hide checkbox
   */
  checkbox: PropTypes.bool,
  checkboxChecked: PropTypes.bool,

  /**
   * Whether unchecked checkbox should block pressing button1
   */
  checkboxBlock: PropTypes.bool,

  /**
   * Show/hide input box
   */
  input: PropTypes.bool,

  /**
   * Rightmost button. Empty string hides button.
   * @default Ok
   */
  button1Text: PropTypes.string,

  /**
   * Second to the right button. Empty string hides button.
   * @default Cancel
   */
  button2Text: PropTypes.string,

  /**
   * Leftmost button. Empty string hides button.
   * @default ''
   */
  button3Text: PropTypes.string,

  /**
   * Whether clicking outside the prompt should cause it to close
   * @default false
   */
  clickOutsideToClose: PropTypes.bool,

  /**
   * Triggered on <ESC> clicking outside of the prompt and on Cancel, unless overriden.
   *
   * This is required because the component does not know how to remove itself from the DOM.
   */
  onClose: PropTypes.func.isRequired,

  /**
   * Triggered on clicking a button. Defaults to onClose
   * @default onClose
   */
  onButton: PropTypes.func,

  /**
   * The body of the prompt to be displayed. Can be a react element or a html string.
   * Newlines are NOT converted into <br/>
   */
  message: PropTypes.any,
  children: PropTypes.any
};