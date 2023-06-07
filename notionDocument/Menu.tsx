import React, { Component } from "react";
import _ from 'lodash';
import { component, styled } from "../../component";
import { XInit } from "../../XObject";
import classNames from "classnames";

const MenuWrapper = styled.div`
  width: 324px;
  border-radius: 4px;
  background: white;
  box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;
  overflow: hidden;
  padding: 6px 0;

  transition: opacity .1s linear, transform .1s linear;

  transform-origin: top left;
  z-index: 999999999;

  &.hidden {
    opacity: 0;
    transform: scale(.9);
  }

  &.visible {
    opacity: 1;
    transform: scale(1);
    animation-name: bounce;
    animation-duration: 0.3s;
  }

  &.closing {
    opacity: 0;
    transform: scale(.9);
  }


  @keyframes bounce {
    20% {
      transform: scale(1.01);
    }
    
    50% {
      transform: scale(0.99);
    }
    
    100% {
      transform: scale(1);
    }
  }




  .item {
    margin: 0 4px;
    user-select: none;
    transition: background 20ms ease-in 0s;
    cursor: pointer;
    border-radius: 3px;
    &.active {
      background: rgba(55, 53, 47, 0.08);
    }
    min-height: 28px;
    display: flex;
    align-items: center;
    padding: 0 14px;
  }
`;

type MenuOption = {
  key: string;
  label: string;
  action: Function;
};

@component
export class Menu extends Component<{ type; menuIniters; }> {
  state = XInit(class {
    index = 0;
    filter = '';
    hoverIndex;
    state = 'hidden';
  });
  down() {
    this.state.index = (this.state.index + 1) % this.filtererOptions().length;
  }
  up() {
    this.state.index = (this.state.index - 1 + this.filtererOptions().length) % this.filtererOptions().length;
  }
  filtererOptions(): MenuOption[] {
    return this.preFiltered() ? this.options() : this.options().filter(o => o.label.toLowerCase().includes(this.state.filter.toLowerCase()));
  }
  setFilter(filter) {
    this.state.filter = filter;
  }
  enter() {
    const option = this.filtererOptions()[this.state.index];
    return option;
  }
  close(cb) {
    this.state.state = 'closing';
    setTimeout(() => {
      cb();
    }, 100);
  }

  preFiltered() {
    return _.isFunction(this.props.menuIniters[this.props.type]);
  }

  options(): MenuOption[] {
    if (this.preFiltered()) {
      return this.props.menuIniters[this.props.type](this.state.filter);
    }
    else {
      return this.props.menuIniters[this.props.type];
    }
  }

  constructor(props) {
    super(props);
  }

  componentDidMount(): void {
    setTimeout(() => {
      this.state.state = 'visible';
    }, 50);
  }

  render() {
    const filteredOptions = this.filtererOptions();
    const index = this.state.index;
    return (
      <MenuWrapper className={this.state.state}>
        {filteredOptions.map((o, i) => (
          <div
            key={o.key}
            className={classNames("item", { active: i == index })}
            onMouseEnter={() => this.state.index = i}
            onMouseLeave={() => this.state.index = null}
          >
            {o.label}
          </div>
        ))}
      </MenuWrapper>
    );
  }
}
