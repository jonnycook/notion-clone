import React, { Component } from "react";
import { component, css, styled } from "../../component";
import { Svg } from "../Svg";
import { color } from "./color";

@component
export class CheckBox extends Component<{
  set;
  get;
  _onChange?;
  _onBeforeChange;
}> {
  static styles = styled.span`
    user-select: none;
    width: 16px;
    height: 16px;
    display: inline-block;
    /* background: ${css.img('unchecked')} no-repeat center; */
    cursor: pointer;
    svg {
      display: block;
    }

    transition: background 200ms ease-out 0s;

    &:hover {
      background: ${color('checkbox.hover.bg')};
    }

    &[data-checked="true"] {
      width: 16px;
      height: 16px;
      background: rgb(35, 131, 226);
      display: flex;;
      justify-content: center;
      align-items: center;

      svg {
        width: 12px;
        height: 12px;
        polygon {
          fill: white;
        }
        background: rgb(35, 131, 226);
        transition: background 200ms ease-out 0s;

      }
    }

    &:not([data-checked="true"]) {
      svg path {
        fill: ${color('text')};
      }
    }

  `;
  
  render(Container?) {
    const checked = this.props.get();
    return <Container
      data-checked={checked}
      onClick={e => {
        this.props._onBeforeChange?.();
        this.props.set(!this.props.get());
        this.props._onChange?.();
      }}
      contentEditable={false}
    >
      {checked ? <Svg name="checked" /> : <Svg name="unchecked" />}
    </Container>;
  }
}
