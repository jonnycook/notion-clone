import React, { Component } from "react";
import ReactDOMClient from "react-dom/client";
import jQuery from "jquery";
import cx from "classnames";
import { component, styled } from "../../component";
import { showContextMenu, SortableCont, SortableEl, SortHandle } from "../../helpers";
import { ColumnManager, RowManager, Column, Row } from "./ColumnManager";
import { plusImage } from "./icons";

@component
export class NotionDatabase extends Component<{
  columnManager: ColumnManager
  rowManager: RowManager
  activeRowId?
  onClickRow?
  dataValuePoint?
  createDataValuePoint?
  onClickAdd?
  onClickAddCol?
  onRightClickCol?
  onEditCol?
  cellArgs?
}> {
  static styles = styled.div` 
    /* padding: 20px; */

    overflow: auto;
    width: 100%;
    box-sizing: border-box;
    position: relative;

    .tableHeader {
      position: sticky;
      top: 0;
      display: flex;
      border-bottom: 1px solid rgba(55, 53, 47, 0.09);
      color: rgba(55, 53, 47, 0.65);
      font-size: 14px;

      .cell {
        flex: 0 0 auto;
        .cont {
          height: 32px;
        line-height: 32px;
        display: flex;
        align-items: center;

        }
        position: relative;
        box-sizing: border-box;
        padding-left: 8px;
        padding-right: 8px;
        border-right: 1px solid rgba(55, 53, 47, 0.09);
        white-space: nowrap;
        overflow: hidden;

        &:hover {
          background: rgba(55, 53, 47, 0.08);
        }
        svg {
          margin-right: 8px;
        }

        .resizeHandle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 0px;
          opacity: 0;
          transition: opacity 200ms ease-out 0s;
          &:hover {
            opacity: 1;
          }
          div {
            width: 5px;
            margin-left: -3px;
            margin-top: -1px;
            height: 34px;
            transition: background 200ms ease-out 0s;
            background: rgba(35, 131, 226, 0.8);
            cursor: col-resize;
          }
        }
      }

      .addCol {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .row {
      position: relative;
      display: flex;
      border-bottom: 1px solid rgba(55, 53, 47, 0.09);

      &.active {
        background: rgba(55, 53, 47, 0.08);
      }

      &:not(:hover) {
        .actions {
          opacity: 0;
        }
      }

      .actions {
        position: absolute;
        right: 100%;
        top: 8px;
        margin-right: 8px;
      }

      .cell {

        .path {
          display: block;
          font-size: 9px;
          color: gray;
          line-height: 13px;
          margin-bottom: 8px;
          /* white-space: nowrap; */
          /* overflow: hidden; */
          /* text-overflow: ellipsis; */
          .comp {
            &:not(:last-child) {
              &:after {
                content: ' / ';
                /* margin-right: 4px; */
              }
            }
          }
        }
        flex: 0 0 auto;
        box-sizing: border-box;
        padding-left: 8px;
        padding-right: 8px;
        border-right: 1px solid rgba(55, 53, 47, 0.09);
        min-height: 32px;
        /* line-height: 32px; */
        padding-top: 8px;
        padding-bottom: 8px;
        

        position: relative;

        &:not(:hover) {
          .open {
            opacity: 0;
          }
        }

        .open {
          position: absolute;
          right: 4px;
          top: 0;
          bottom: 0;
          margin: auto;
          user-select: none;
          
          transition: background 20ms ease-in 0s;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 3px;
          height: 24px;
          padding: 0px 6px;
          background: white;
          box-shadow: rgba(15, 15, 15, 0.1) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 2px 4px;

          &:hover {
            background: rgb(239, 239, 238);
          }


          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(55, 53, 47, 0.65);
          margin-left: 4px;

        }
      }
    }

    .addRow {
      box-sizing: border-box;
      svg {
        margin-right: 8px;
      }
      display: flex;
      height: 32px;
      align-items: center;
      color: rgba(55, 53, 47, 0.5);
      padding: 0 8px;
      cursor: pointer;

      &:hover {
        background: rgba(55, 53, 47, 0.08);
      }
    }
  `;

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    jQuery(window).mousemove((e) => {
      if (this.resizingColumn) {
        const column = jQuery('[data-column-id="' + this.resizingColumn + '"]')[0];
        const { x, width } = column.getBoundingClientRect();
        const newWidth = e.clientX - x;
        if (newWidth > 0) {
          this.props.columnManager.columns().find(c => c.id() == this.resizingColumn).setWidth(newWidth);
        }
      }
    });

    jQuery(window).mouseup((e) => {
      if (this.resizingColumn) {
        this.resizingColumn = null;
        jQuery('html').removeClass('cursor-col-resize');
      }
    });
  }
  resizingColumn
  editComp
  presentEditComp(frame, col: Column, row: Row) {
    const cont = jQuery('<div />').css({
      position: 'fixed',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 9999999,
    });

    const close = () => {
      cont.remove();
      root.unmount();
    }
    cont.click((e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    const cont2 = jQuery('<div />').css({
      position: 'absolute',
      left: frame.left + 'px',
      top: frame.top + 'px',
    });
    cont.append(cont2);
    cont2.click((e) => {
      e.stopPropagation();
    });

    jQuery('body').append(cont);

    const root = ReactDOMClient.createRoot(cont2[0]);

    const cell = col.cellObj(row);

    let timerId;
    root.render(cell.renderEditor({
      state: null,
      close,
      frame,
      value: () => row.value(col.id(), cell.defaultValue),
      setValue: value => {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
          row.setValue(col.id(), value);
        }, 0);
      }
    }));
  }
  
  render(Container?) {
    const columns = this.props.columnManager.columns()
    const rows = this.props.rowManager.rows();
    let totalWidth = 0;
    for (const column of columns) {
      totalWidth += column.width();
    }

    if (this.props.columnManager.canAddDeleteColumns) {
      totalWidth += 32;
    }

    return (
      <Container data-value-point={this.props.dataValuePoint}>
        <SortableCont
          style={{
            width: totalWidth + 'px'
          }}
          className="tableHeader"
          axis="x"
          useDragHandle
          onSortEnd={(sortEnd) => {
            this.props.columnManager.move(sortEnd.oldIndex, sortEnd.newIndex);
          }}
        >
          {columns.map((column, i) => (
            <SortableEl key={column.id()} index={i}>
              <div
                className="cell"
                onContextMenu={e => {
                  e.preventDefault();
                  showContextMenu(e, [
                    {
                      text: 'Delete',
                      onClick: () => {
                        columns.splice(i, 1);
                      }
                    },
                    {
                      text: 'Edit',
                      onClick: () => {
                        this.props.onEditCol(column);
                      }
                    },
                    {
                      text: 'Rename',
                      onClick: () => {
                        const name= prompt('Enter new name', column.title());
                        if (name) {
                          column.setTitle(name);
                        }
                      }
                    },
                  ]);
                }}
                data-column-id={column.id()} style={{ width: column.width() + 'px' }}
              >
                <SortHandle>
                  <div className="cont">
                    {/* <> */}
                      {column.getIcon()} {column.title()}
                    {/* </> */}
                  </div>
                </SortHandle>

                <div className="resizeHandle"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.resizingColumn = column.id();
                    jQuery('html').addClass('cursor-col-resize');
                  }}
                  ><div />
                </div>
                
              </div>
            </SortableEl>
          ))}
          {this.props.onClickAddCol && <div className="addCol"
            onClick={e => {
              this.props.onClickAddCol?.(e);
            }}
          >
            {plusImage}
          </div>}
        </SortableCont>
        {rows.map((row) => (
          <div
            style={{
              width: totalWidth + 'px'
            }}
            className={cx('row', {
              active: this.props.activeRowId === row.id()
            })}
            key={row.id()}
            onContextMenu={e => {
              e.preventDefault();
              showContextMenu(e, [
                {
                  text: 'Delete',
                  onClick: () => {
                    this.props.rowManager.deleteRow(row.id());
                  }
                }
              ]);
            }}
          >
            {/* <div className="actions">
              <Svg name="grip"
              />
            </div> */}
            {columns.map((column) => {
              const cell = column.cellObj(row);
              const d = cell?.renderValue?.(row.value(column.id(), undefined, 'display'), {
                args: this.props.cellArgs,
                row,
                setValue: value => {
                  console.log(value);
                  row.setValue(column.id(), value);
                }
              });
              return (
                <div
                  key={column.id()}
                  className={cx('cell')}
                  style={{ width: column.width() + 'px' }}
                  onContextMenu={e => {
                    e.preventDefault();
                  }}
                  onMouseDown={(e) => {
                    if (e.button == 2) return;
                    if (e.target != e.currentTarget) {
                      return;
                    }
                    e.preventDefault();
                    this.presentEditComp((e.target as any).getBoundingClientRect(), column, row);
                  }}
                >
                  {d}
                  {cell.showOpenButton() && (
                    <span
                      className="open"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.props.onClickRow?.(row.id());
                      }}
                    >
                      Open
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {this.props.onClickAdd && (
          <div
            style={{
              width: totalWidth + 'px'
            }}
            className="addRow"
            data-value-point={this.props.createDataValuePoint}
            onClick={() => {
              this.props.onClickAdd?.();
            }}
          >
            {plusImage} New
          </div>
        )}
      </Container>
    )
  }
}