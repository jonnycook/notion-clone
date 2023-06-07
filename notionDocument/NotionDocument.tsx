import React, { Component } from "react";
import _ from "lodash";
import ReactDOM from "react-dom";
import ReactDOMClient from "react-dom/client";
import classNames from "classnames";
import jQuery from "jquery";
import { ThemeProvider } from 'styled-components';
import { component, styled } from "../../component";
import { X, XClone, XInit, XObject } from "../../XObject";
import { showContextMenu } from "../../etc/showContextMenu";
import { BlocksList, BlockManager, Block, BlockColumns } from "./BlockManager";
import { Data } from "../richTextHelpers";
import { color } from "./color";
import { Menu } from "./Menu";
import { Type } from "../richTextHelpers";
import { DataCtx, dataLength, sliceData, concatData, extractFromEl, dataToString, createChunked } from "../richTextHelpers";

// BLOCK FUNCS
function findBlockParent(blockManager: BlockManager, id, parent=null) {
  return blockManager.findBlockParent(id);
  // for (const block of blocks) {
  //   if (block._id === id) {
  //     return parent;
  //   }
  //   if (block.children) {
  //     const p = findBlockParent(block.children, id, block);
  //     if (p) {
  //       return p;
  //     }
  //   }
  // }
  // return null;
}

function unindentBlock(blockManager: BlockManager, id) {
  const parent = blockManager.findBlockParent(id);
  const block = blockManager.findBlock(id);
  if (parent) {
    const grandparent = parent.getParent();
    if (grandparent) {
      const index = grandparent.getChildren().indexOf(parent);
      grandparent.getChildren().splice(index + 1, 0, block);
      parent.getChildren().splice(parent.getChildren().indexOf(block), 1);
      clearSelection()
      setTimeout(() => {
        const el = jQuery(`[data-block-id="${block.getId()}"]`);
        const editorEl = el.find('.editor');
        setCaret(editorEl[0])
      }, 0);

    }
    else {
      const index = blockManager.getRootBlocks().indexOf(parent);
      blockManager.getRootBlocks().splice(index + 1, 0, block);
      parent.getChildren().splice(parent.getChildren().indexOf(block), 1);
      clearSelection()

      setTimeout(() => {
        const el = jQuery(`[data-block-id="${block.getId()}"]`);
        const editorEl = el.find('.editor');
        setCaret(editorEl[0])
      }, 0);

    }
  }

}

function indentBlock(blockManager: BlockManager, id) {
  const parent = findBlockParent(blockManager, id);
  const block = findBlock(blockManager, id);
  let containingList: BlocksList;
  if (parent) {
    containingList = parent.getChildren();
  }
  else {
    containingList = blockManager.getRootBlocks();
  }

  const index = containingList.indexOf(block);
  const prevBlock = containingList.get(index - 1);
  if (prevBlock) {
    prevBlock.getChildren().push(block);
    containingList.splice(index, 1);
    clearSelection();

    setTimeout(() => {
      const el = jQuery(`[data-block-id="${block.getId()}"]`);
      const editorEl = el.find('.editor');
      setCaret(editorEl[0]);
    }, 0);
  }

}


export function findBlock(blockManager: BlockManager, id, errorOnNotFound=false) {
  return blockManager.findBlock(id, errorOnNotFound);
  // for (const block of blocks) {
  //   if (block._id === id) {
  //     return block;
  //   }
  //   if (block.children) {
  //     const p = findBlock(block.children, id);
  //     if (p) {
  //       return p;
  //     }
  //   }
  // }
  // if (errorOnNotFound) {
  //   throw new Error(`Block with id ${id} not found`);
  // }
  // return null;
}


/*function findBlockMatching(blocks, predicate) {
  for (const block of blocks) {
    if (predicate(block)) {
      return block;
    }
    if (block.children) {
      const p = findBlockMatching(block.children, predicate);
      if (p) {
        return p;
      }
    }
  }
  return null;
}*/


function findBlocksMatching(blocks: BlocksList, predicate) {
  const results = [];
  for (const block of blocks.getArray()) {
    if (predicate(block)) {
      results.push(block);
    }
    if (block.hasChildren()) {
      results.push(...findBlocksMatching(block.getChildren(), predicate));
    }
  }
  return results;
}
function removeBlock(blockManager: BlockManager, id, fixColumns=false) {
  const parent = findBlockParent(blockManager, id);
  const theseBlocks = parent ? parent.getChildren() : blockManager.getRootBlocks();
  const index = theseBlocks.indexOfId(id);
  if (index != -1) {
    const col = fixColumns && blockManager.getBlockColumn(id, true);
    if (col) {
      console.log(1);
      const blockColumns = col[0];
      const column = blockColumns.getColumns()[col[1]];
      if (column.getChildren().getLength() == 1) {
        console.log(2, blockColumns.getColumns().length);
        blockColumns.removeColumn(col[1]);
        console.log(22, blockColumns.getColumns().length);
        if (blockColumns.getColumns().length == 1) {
          console.log(3);
          const list = blockColumns.getColumns()[0].getChildren();
  
          const rootBlocks = blockManager.getRootBlocks();
          const index = rootBlocks.indexOf(blockColumns as any);
          rootBlocks.splice(index, 1, ...list.getArray());
        }
  
      }
      else {
        theseBlocks.splice(index, 1);
      }
    
      // const rootBlocks = blockManager.getRootBlocks();
      // const index = rootBlocks.indexOf(blockColumns as any);

    }
    else {
      theseBlocks.splice(index, 1);
    }
    return true;
  }
  else {
    return false;
  }

}

function getBlockIndentation(blockManager: BlockManager, id) {
  const parent = findBlockParent(blockManager, id);
  if (parent && parent instanceof Block) {
    return getBlockIndentation(blockManager, parent.getId()) + 1;
  }
  else {
    return 0;
  }
}

function canIndentBlock(blockManager: BlockManager, id) {
  const parent = findBlockParent(blockManager, id);
  let containingList: BlocksList;
  if (parent) {
    containingList = parent.getChildren();
  }
  else {
    containingList = blockManager.getRootBlocks();
  }
  const index = containingList.indexOfId(id);
  return index > 0;
}

function canUnindentBlock(blockManager: BlockManager, id) {
  return getBlockIndentation(blockManager, id) > 0;
}

// SELECTION FUNCS
function setCaret(el) {
  const range = document.createRange()
  const sel = window.getSelection()
  
  const node = el.childNodes[el.childNodes.length - 1];
  if (node) {
    range.setStart(node, node?.length || 0)
  }
  else {
    range.setStart(el, 0)
  }
  range.collapse(true)
  
  sel.removeAllRanges()
  sel.addRange(range)
}

function clearSelection() {
  if (window.getSelection) {window.getSelection().removeAllRanges();}
  else if ((document as any).selection) {(document as any).selection.empty();}
}


// TODO: update to support entities
// iterator through a tree of nodes
function resolveOffset(ctx: DataCtx, el, position): [Node, number] {
  const { types } = ctx;
  let offset = 0;
  let node = el.firstChild;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (offset + node.length >= position) {
        return [node, position - offset];
      }
      offset += node.length;
    }
    else if (types[node.getAttribute('data-type')]?.type == Type.atomic) {
      offset += 1;
    }
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const [foundNode, foundOffset] = resolveOffset(ctx, node, position - offset);
      if (foundNode) {
        return [foundNode, foundOffset];
      }
      offset += node.textContent.length;
    }
    node = node.nextSibling;
  }
  return [el, position];
}

function createRangeArrayFromBlockSelection(ctx: DataCtx, blockSelection): [Node, number, Node, number] {
  const [start, end] = blockSelection;
  const startBlock = document.querySelector(`[data-block-id="${start.blockId}"] .editor`);
  const endBlock = document.querySelector(`[data-block-id="${end.blockId}"] .editor`);

  return [
    ...resolveOffset(ctx, startBlock, start.position),
    ...resolveOffset(ctx, endBlock, end.position)
  ]

}

function createRangeFromBockSelection(ctx: DataCtx, blockSelection) {
  const [start, end] = blockSelection;
  const startBlock = document.querySelector(`[data-block-id="${start.blockId}"] .editor`);
  const endBlock = document.querySelector(`[data-block-id="${end.blockId}"] .editor`);

  const range = document.createRange();

  range.setStart(...resolveOffset(ctx, startBlock, start.position));
  range.setEnd(...resolveOffset(ctx, endBlock, end.position));
  return range;
}

function setCaretToBlockSelection(ctx: DataCtx, blockSelection) {
  if (blockSelection.length > 0) {
    const range = createRangeArrayFromBlockSelection(ctx, blockSelection);
    window.getSelection().setBaseAndExtent(...range);

  }
}

export function getBlockSelection(ctx: DataCtx, sorted=false): [{blockId, position}, {blockId, position}] | [] {
  if (sorted) {
    const selection = getBlockSelection(ctx);
    const blockIds = getSelectedBlockIds();
    const firstId = blockIds[0];
    const lastId = blockIds[blockIds.length - 1];
    const first = selection.find(s => s.blockId === firstId);
    const last = selection.find(s => s.blockId === lastId);
    return [first, last];
  }
  else {
    const selection = window.getSelection();
    if (!selection.anchorNode) return [];
    const anchor = _getPositionInBlock(ctx, 'anchor');
    const focus = _getPositionInBlock(ctx, 'focus');
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    const anchorBlock = jQuery(anchorNode).closest('[data-block-id]');
    const focusBlock = jQuery(focusNode).closest('[data-block-id]');
    const anchorBlockId = anchorBlock.attr('data-block-id');
    const focusBlockId = focusBlock.attr('data-block-id');
  
    if (!anchorBlockId || !focusBlockId) return [];
  
  
    return [{
      blockId: anchorBlockId,
      position: anchor
    }, {
      blockId: focusBlockId,
      position: focus
    }]
  }

}

function getSelectionHtml() {
  var html = "";
  if (typeof window.getSelection != "undefined") {
    var sel = window.getSelection ();
    if (sel.rangeCount) {
      var container = document.createElement ("div");
      for (var i = 0, len = sel.rangeCount; i < len; ++i) {
        container.appendChild (sel.getRangeAt (i).cloneContents ());
      }
      html = container.innerHTML;
    }
  } else if (typeof (document as any).selection != "undefined") {
    if ((document as any).selection.type == "Text") {
      html = (document as any).selection.createRange ().htmlText;
    }
  }
  return html;
}


function _getPositionInBlock(ctx: DataCtx, which) {
  const { types } = ctx;
  const selection = window.getSelection();
  if (!selection[which + 'Node']) return -1;
  let position = selection[which + 'Offset'];

  const node = selection[which + 'Node'];
  if (node.getAttribute?.('data-type') === 'blockData') {
    return position;
  }

  if (!node) return 0;


  let rootNode = node;
  while (rootNode && rootNode.getAttribute?.('data-type') !== 'blockData') {
    rootNode = rootNode.parentNode;
  }
  if (!rootNode) return 0;

  let pos = 0;

  const findNode = n => {
    if (n == node) {
      pos += position;
      return true;
    }
    else if (types[n.getAttribute?.('data-type')]?.type == Type.atomic) {
      pos += 1;
    }
    else if (n.nodeType == Node.TEXT_NODE) {
      pos += n.textContent?.length || 0;
    }
    else if (n.nodeType == Node.ELEMENT_NODE) {
      if (n.childNodes) {
        for (let i = 0; i < n.childNodes.length; i++) {
          if (findNode(n.childNodes[i]) === true) {
            return true;
          }
        }
      }
    }
  }

  findNode(rootNode);

  return pos;


}


function getPositionInBlock(ctx: DataCtx) {
  return _getPositionInBlock(ctx, 'anchor');
}


function getSelectedBlockIds() {
  const el = document.createElement('div');
  el.innerHTML = getSelectionHtml();
  const blockEls = jQuery(el).find('[data-block-id]');
  return blockEls.toArray().map((el) => el.getAttribute('data-block-id'));
}

function getFirstPos(ctx: DataCtx) {
  if (window.getSelection().isCollapsed) {
    return getPositionInBlock(ctx);
  }
  else {
    const firstBlock = getSelectedBlockIds()[0];
    return getBlockSelection(ctx).find((s) => s.blockId === firstBlock).position;  
  }
}


function getFirstBlockInSelection(ctx: DataCtx) {
  if (isMultiBlockSelection()) {
    const firstBlock = getSelectedBlockIds()[0];
    return getBlockSelection(ctx).find(b => b.blockId == firstBlock);  
  }
  else {
    return getBlockSelection(ctx)[0];
  }
}

function isMultiBlockSelection() {
  if (!window.getSelection().isCollapsed) {
    const el = document.createElement('div');
    el.innerHTML = getSelectionHtml();
    const blockEls = jQuery(el).find('[data-block-id]').toArray();
    return blockEls.length > 1;
  }

  return false;
}

export function isFullSelection(ctx: DataCtx, blockManager: BlockManager) {
  const el = document.createElement('div');
  el.innerHTML = getSelectionHtml();
  const blockEls = jQuery(el).find('[data-block-id]').toArray();

  if (blockEls.length) {
    const sortedSel = getBlockSelection(ctx, true);
    if (sortedSel.length != 2) return false;
    // console.log(sortedSel[0].position, dataLength(findBlock(blocks, sortedSel[1].blockId).data), sortedSel[1].position);
    if (sortedSel[0].position == 0 && dataLength(ctx, findBlock(blockManager, sortedSel[1].blockId)?.getContent?.() || []) == sortedSel[1].position) {
      console.log('full delete');
      return true;
    }
  }
}

// MISC
function deleteSelection(ctx: DataCtx, blockManager: BlockManager, replacementChar?) {
  const el = document.createElement('div');
  el.innerHTML = getSelectionHtml();
  const blockEls = jQuery(el).find('[data-block-id]').toArray();

  if (blockEls.length) {
    const blockIds = blockEls.map(el => el.getAttribute('data-block-id'));

    if (isFullSelection(ctx, blockManager)) {
      const fl = flatList(null, blockManager).filter(({ _id }) => !blockIds.includes(_id));
      blockManager.setRootBlocks(constructTree(blockManager, fl));
      // setBlocks(constructTree(fl));
      return;
    }

    console.log('multiple blocks selected')
    const anchor = _getPositionInBlock(ctx, 'anchor');
    const focus = _getPositionInBlock(ctx, 'focus');

    const selection = getBlockSelection(ctx);


    console.log(anchor, focus, selection);

    // const copiedBlocks = [];

    const firstBlockId = blockIds[0];
    const firstBlock = findBlock(blockManager, firstBlockId);
    const firstBlockPos = selection.find(({ blockId }) => blockId == firstBlockId).position;
    // const firstBlockLength = dataLength(firstBlock.data);
    const firstSlice = sliceData(ctx, firstBlock.getContent(), 0, firstBlockPos);

    const lastBlockId = blockIds[blockIds.length - 1];

    const lastBlockPos = selection.find(({ blockId }) => blockId == lastBlockId).position;


    const lastBlock = findBlock(blockManager, lastBlockId);
    const lastBlockLength = dataLength(ctx, lastBlock.getContent());
    
    // console.log(lastBlockPos, lastBlockLength - lastBlockPos + 1, lastBlockLength, lastBlockId, dataToString();

    const lastSlice = sliceData(ctx, lastBlock.getContent(), lastBlockPos, lastBlockLength);

    const newData = replacementChar !== undefined ? concatData(ctx, concatData(ctx, firstSlice, [replacementChar]), lastSlice) : concatData(ctx, firstSlice, lastSlice);


    if (lastBlock.syncing()) {
      const lastBlockEl = jQuery(el).find(`[data-block-id="${lastBlock.getId()}"]`)[0];
      const data = extractFromEl(ctx, jQuery(lastBlockEl).find('[data-type="blockData"]')[0]);
      
      updateBlockData(lastBlock, X(data));
    }

    for (let i = blockIds.length - 1; i >= 1; i--) {
      removeBlock(blockManager, blockIds[i]);
    }
    // firstBlock.data = XClone(newData);
    firstBlock.setContent(newData);

  
    // firstBlock.children = X(x(lastBlock.children || []).concat(x(firstBlock.children) || []));
    firstBlock.setChildren(lastBlock.getChildren().concat(firstBlock.getChildren()));
    
    
    clearSelection();
  }
  else {
    document.execCommand('delete');
    return true;
  }
}


function flatList(block: Block, blockManager: BlockManager): FlatList {
  const list: FlatList = [];
  const add = (blocks: BlocksList, parent=null, indentationLevel = 0) => {
    for (const block of blocks.getArray()) {
      list.push(block.serialize());
      if (block.hasChildren()) {
        add(block.getChildren(), block.getId(), indentationLevel + 1);
      }
    }
  }

  add(block.getRootBlockList());

  return list;
}

type FlatList = {
  _id: string,
  content: Data
  data
  indentationLevel: number,
  position?
}[];

function constructTree(blockManager: BlockManager, flatList: FlatList): BlocksList {
  const findParent = (fromI, currentIndentation) => {
    for (let i = fromI - 1; i >= 0; -- i) {
      const block = flatList[i];
      if (block.indentationLevel < currentIndentation) {
        return block;
      }
    }
    return null;
  }

  const rootBlocks = blockManager.newBlocksList();
  const blocksMap: {
    [key: string]: Block,
  } = {};
  for (let i = 0; i < flatList.length; ++ i) {
    const block = flatList[i];

    const newBlock = blockManager.newBlock(block._id);
    newBlock.deserialize(block);

    blocksMap[block._id] = newBlock;
    const parent = findParent(i, block.indentationLevel);
    if (parent) {
      const parentBlock = blocksMap[parent._id];
      parentBlock.getChildren().push(newBlock);
    } else {
      rootBlocks.push(newBlock);
    }
  }

  return rootBlocks;
}


function isOnTitle() {
  return jQuery(window.getSelection().focusNode).parents('[data-type="title"]').length || jQuery(window.getSelection().focusNode).is('[data-type="title"]');
}

function paste() {

}

function copy(ctx: DataCtx, blockManager: BlockManager, e) {
  const el = document.createElement('div');
  el.innerHTML = getSelectionHtml();
  const blockEls = jQuery(el).find('[data-block-id]');
  if (blockEls.length) {
    const copiedBlocks: FlatList = [];
    let i = 0;
    for (const blockEl of blockEls) {
      const id = blockEl.getAttribute('data-block-id');
      const data = extractFromEl(ctx, jQuery(blockEl).find('[data-type="blockData"]')[0]);
      const indentation = getBlockIndentation(blockManager, id);
      const block = findBlock(blockManager, id, true);
      let position;
      if (i == 0) {
        position = getFirstPos(ctx);
      }
      else {
        position = 0;
      }

      copiedBlocks.push({
        ...block.serialize(),
        // content: data,
        // data: block.serializeData(),
        position,
        indentationLevel: indentation,
      });
      ++ i;
    }
    e.originalEvent.clipboardData.setData('text/_blocks', JSON.stringify(copiedBlocks));
    console.log(copiedBlocks)
  }
  else {
    // e.originalEvent.clipboardData.setData('text/test', 'test');
    const data = extractFromEl(ctx, el);
    console.log(el, data);
    e.originalEvent.clipboardData.setData('text/_blockSegment', JSON.stringify(data));
    e.originalEvent.clipboardData.setData('text/plain', dataToString(ctx, data));
  }
}

function executeEnter(ctx: DataCtx, blockManager: BlockManager, blockId, pos, e) {
  const block = findBlock(blockManager, blockId);
  let newBlock: Block;

  if (pos == 0 && dataLength(ctx, block.getContent()) > 0) {
    newBlock = blockManager.newBlock();

    const parent = findBlockParent(blockManager, blockId);

    let blocks: BlocksList;
    if (parent) {
      blocks = parent.getChildren();
    }
    else {
      blocks = blockManager.getRootBlocks();
    }

    blocks.splice(blocks.indexOf(block), 0, newBlock);
    
    return block;
  }
  else {
    const position = pos;
    const length = dataLength(ctx, block.getContent());
    const firstPart = sliceData(ctx, block.getContent(), 0, position);
    const secondPart = sliceData(ctx, block.getContent(), position, length);

    updateBlockData(block, firstPart);
    
    newBlock = e.altKey ? blockManager.newBlock() : block.createBlock();

    updateBlockData(newBlock, secondPart);
    
    if (block.hasChildren()) {
      block.getChildren().splice(0, 0, newBlock);  
    }
    else {
      const parent = findBlockParent(blockManager, blockId);

      let blocks: BlocksList;
      if (parent) {
        blocks = parent.getChildren();
      }
      else {
        blocks = blockManager.getRootBlocks();

      }

      blocks.splice(blocks.indexOf(block) + 1, 0, newBlock);
    }
  }

  return newBlock;
}

function updateBlockSyncedData(block: Block, data: Data) {
  // TODO: implement
  // if (block.id) {
  //   const entity = db.entities.findById(block.id);
  //   if (entity) {
  //     XObject.withPass({ internal: block._id }, () => {
  //       entity.name = dataToString(block.data || []);
  //     });
  //   }
  // }
  // else if (block.record) {
  //   // const db = new DB(this.props.database);
  //   const titleCol = db.titleCol();
  //   const record = db.getRecord(block.record);
  //   if (record) {
  //     XObject.withPass({ internal: block._id }, () => {
  //       record.data[titleCol._id] = X(x(block.data))[0] || '';
  //     });
  //   }
  // }

}

function updateBlockData(block: Block, data: Data) {
  block.setContent(XClone(data));

  updateBlockSyncedData(block, data);
}

@component
export class NotionDocument extends Component<{
  blockManager: BlockManager,
  title?,
  setTitle?,
  renderBlock
  menuIniters?
  extState?
  types,
  renderBlockArgs?
  insidePositionContext?: boolean,
  onBlockSelected?
}> {
  static styles = styled.div`
    background-color: ${color('bg')};
    color: ${color('text')};
    padding-bottom: 100px;
    position: relative;

    > .wrapper {
      &.hideOverlays .grip {
        opacity: 0;
      }
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
      -webkit-font-smoothing: auto;
      cursor: text;
      padding: 32px 30px;

      padding-top: 8px;
      padding-bottom: 8px;

      &:focus {
        outline: none;
      }

      > .title {
        margin-bottom: 10px;
        min-height: 31px;
        font-weight: 700;
        line-height: 1.2;
        font-weight: 600;
        font-size: 26px;

        &:empty::before {
          content: 'Untitled';
          color: #373737; 
        }
        &:empty:focus::before {
            content: "";
        }
      }

      > .dragArea {
        z-index: 5;
        &.hovering {
          &.above {
            border-top: 3px solid #9fd4ee;
          }

          &.below {
            border-bottom: 3px solid #9fd4ee;
          }

          &.left {
            border-left: 3px solid #9fd4ee;
          }

          &.right {
            border-right: 3px solid #9fd4ee;
          }
        }
      }
    }

  `;

  static reactive = false;

  title

  showMenu

  history = [];
  historyIndex = 0;

  menuRef = React.createRef<Menu>();

  currentScroll
  selection
  menuPos

  blockManager: BlockManager;

  dragging
  dragStart

  wrapperEl = {current: null}
  _tick = 0

  hideOverays = false;

  ignoreEnter

  letNextInsert

  position

  initial

  ctx: DataCtx;


  state = XInit(class {
    activeBlock
  });


  constructor(props) {
    super(props);
    this.title = this.props.title;
    this.blockManager = this.props.blockManager;
    this.ctx = {
      types: this.props.types,
    }
  }

  componentDidMount() {
    const el = ReactDOM.findDOMNode(this);

    jQuery(el).on('cut', '[contenteditable]', this.collectFunc((e) => {
      this.saveState('cut');
      e.preventDefault();
      copy(this.ctx, this.blockManager, e);
      this.deleteSelection();
      this.forceUpdate();  
    }));

    jQuery(el).on('copy', '[contenteditable]',  this.collectFunc((e) => {
      copy(this.ctx, this.blockManager, e);
      e.preventDefault();
    }));
    
    jQuery(el).on('paste', '[contenteditable]',  this.collectFunc((e) => {
      const d = e.originalEvent.clipboardData.getData('text/_blocks')
      e.preventDefault();
      if (d) {
        this.saveState('paste');
        const pastedData: FlatList = JSON.parse(d);
        const a = getFirstBlockInSelection(this.ctx);
        const currentBlockId = a.blockId;
        const position = a.position;

        if (!window.getSelection().isCollapsed) {
          if (this.deleteSelection()) {
            this.save('paste');
          }
        }

        // console.log(pastedData, currentBlockId);
        const fullCopy = pastedData[0].position == 0;

        const flatList = this.flatList(this.blockManager.findBlock(currentBlockId));
        const currentBlockIndex = flatList.findIndex((block) => block._id === currentBlockId);
        const currentBlockIndentation = flatList[currentBlockIndex].indentationLevel;

        const newBlocks: FlatList = [];
        let firstIndentation = null;
        let lastSlice;

        let i = 0;
        for (const pastedBlock of pastedData) {
          if (firstIndentation === null) {
            firstIndentation = pastedBlock.indentationLevel;

            if (!fullCopy) {
              const c = flatList.find((block) => block._id === currentBlockId);


              const length = createChunked(this.ctx, c.content).length;

              const firstSlice = sliceData(this.ctx, c.content, 0, position);
              lastSlice = sliceData(this.ctx, c.content, position, length);

              c.content = concatData(this.ctx, firstSlice, pastedBlock.content);
            }
            else {
              newBlocks.push({
                _id: XObject.id(),
                content: pastedBlock.content,
                data: pastedBlock.data,
                indentationLevel: pastedBlock.indentationLevel - firstIndentation + currentBlockIndentation,
              })
  
            }

          }
          else {

            let data = pastedBlock.content;
            if (!fullCopy && i === pastedData.length - 1) {
              data = concatData(this.ctx, data, lastSlice);
            }
            newBlocks.push({
              _id: XObject.id(),
              data: pastedBlock.data,
              content: data,
              indentationLevel: pastedBlock.indentationLevel - firstIndentation + currentBlockIndentation,
            })
          }

          ++i;

        }

        if (!fullCopy) {
          const last = newBlocks[newBlocks.length - 1];
          // TODO: huh?
          // if (last.id) {
          //   updateBlockSyncedData(last, last.data);
          // }  
        }

        if (fullCopy && dataLength(this.ctx, flatList[currentBlockIndex].content) == 0) {
          flatList.splice(currentBlockIndex, 1, ...newBlocks);
        }
        else {
          flatList.splice(currentBlockIndex + 1, 0, ...newBlocks);
        }

        const tree = this.constructTree(flatList);
        this.blockManager.setRootBlocks(tree);
        this.doTick();
      }
      else {
        let d = e.originalEvent.clipboardData.getData('text/_blockSegment')
        let pasted;
        if (d) {
          d = JSON.parse(d);
          pasted = d;
          // console.log(d);
        }
        else {
          d = e.originalEvent.clipboardData.getData('text/plain');
          if (d) {
            // console.log(d);
            pasted = [d];
          }
        }

        if (pasted) {
          this.saveState('paste');
          const block = findBlock(this.blockManager, getBlockSelection(this.ctx)[0].blockId);
          const position = getBlockSelection(this.ctx)[0].position;
          const length = createChunked(this.ctx, block.getContent()).length;
          const firstSlice = sliceData(this.ctx, block.getContent(), 0, position);
          const lastSlice = sliceData(this.ctx, block.getContent(), position, length);
          block.setContent(X(concatData(this.ctx, concatData(this.ctx, firstSlice, pasted), lastSlice)));
          this.doTick();
        }
      }
    }));

    jQuery(el).on('beforeinput', '[contenteditable]', (e) => {
      if (this.showMenu) return;
      if (isOnTitle()) {
        if (e.originalEvent.inputType == 'insertParagraph') {
          e.preventDefault();
          const newBlock = this.blockManager.newBlock();
          this.blockManager.getRootBlocks().splice(0, 0, newBlock);
          this.doTick();

          setTimeout(() => {
            setCaretToBlockSelection(this.ctx, [
              {
                blockId: newBlock.getId(),
                position: 0,
              },
              {
                blockId: newBlock.getId(),
                position: 0,
              }
            ])
          }, 0)

          return;
        }
      }
      const type = e.originalEvent.inputType;
      if (type.startsWith('format') || type.startsWith('insert') || type.startsWith('delete')) {
        this.saveState(type);
      }
    });

    jQuery(el).on('input', '[contenteditable]', e => {
      if (this.showMenu) return;
      if (isOnTitle()) {
        const titleEl = jQuery(window.getSelection().focusNode).closest('[data-type="title"]')
        console.log(titleEl.text(), titleEl.html(), titleEl[0]);
        if (!titleEl.text()) titleEl.text('');
        this.props.setTitle(titleEl.text());
        this.title = titleEl.text();
      }
      else {
        const type = e.originalEvent.inputType;
        if (type.startsWith('format') || (type.startsWith('insert') || type.startsWith('delete')) && !this.showMenu) {
          this.save('input');
        }
      }
    });

    document.addEventListener('selectionchange', e => {
      const b = getBlockSelection(this.ctx);
      const blockId = b?.[0]?.blockId;
      if (!blockId) return;
      if (blockId != this.state.activeBlock) {
        this.state.activeBlock = blockId;
        if (this.props.extState) {
          this.props.extState.activeBlock = blockId;
        }
        const block = findBlock(this.blockManager, blockId);
        this.props.onBlockSelected?.(block);

        jQuery(this.wrapperEl.current).find('.activeBlock').removeClass('activeBlock');
        jQuery(this.wrapperEl.current).find(`[data-block-id="${this.state.activeBlock}"]`).addClass('activeBlock');  
      }
    });

    jQuery(window).mousemove(e => {
      if (this.dragStart) {
        this.dragging = this.dragStart;
        delete this.dragStart;
        this.updateAreas();
        this.forceUpdate();
        jQuery('html').addClass('dragging');
      }
      if (this.dragging) {
        
        // find area under cursor
        const area = jQuery(document.elementFromPoint(e.clientX, e.clientY)).closest('.dragArea');

        jQuery('.dragArea.hovering').removeClass('hovering');
        area.addClass('hovering');
      }
    })

    jQuery(window).mouseup(e => {
      delete this.dragStart;
      if (this.dragging) {
        const areaEl = jQuery(document.elementFromPoint(e.clientX, e.clientY)).closest('.dragArea');
        
        const area = this.areas[areaEl.attr('data-index')];
        
        // console.log(area);
        this.saveState('drop');
        area.action(this.blockManager.findBlock(this.dragging._id));
        this.dragging = false;
        jQuery('.dragArea.hovering').removeClass('hovering');
        jQuery('html').removeClass('dragging');
      }
    });

    const updateMetaPos = () => {
      this.updateMetaPos();
    }

    setInterval(() => {
      updateMetaPos();
    }, 10);
    updateMetaPos();

    jQuery(el).click(e => {
      const wrapper = jQuery(el).children('.wrapper')[0];
      const rect = wrapper.getBoundingClientRect();

      if (e.clientY > rect.bottom) {
        const lastBlock = this.blockManager.getRootBlocks().get(this.blockManager.getRootBlocks().getLength() - 1);
        if (!lastBlock || !(lastBlock instanceof Block) || !lastBlock.hasContent() || dataLength(this.ctx, lastBlock.getContent()) > 0) {
          const newBlock = this.blockManager.newBlock();
          this.blockManager.getRootBlocks().push(newBlock);
          this.doTick();
          setTimeout(() => {
            setCaretToBlockSelection(this.ctx, [
              { blockId: newBlock.getId(), position: 0 },
              { blockId: newBlock.getId(), position: 0}
            ]);
          }, 0);
        }
        else {
          setTimeout(() => {
            setCaretToBlockSelection(this.ctx, [
              { blockId: lastBlock.getId(), position: 0 },
              { blockId: lastBlock.getId(), position: 0}
            ]);
          }, 0);
        }
      }
    });
  }

  componentDidUpdate(): void {
    if (this.selection) {
      setCaretToBlockSelection(this.ctx, this.selection);
      this.selection = null;
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    // TODO: reimplement
    // return nextProps.blocks != this.props.blocks;
    return false;
  }

  transaction(block) {
    block();
  }

  renderBlock(b) {
    return this.props.renderBlock(b, {
      ctx: this.ctx,
      onMouseDownGrip: (e, b) => {
        this.dragStart = b;
        e.preventDefault();
      },
      draggingId: this.dragging?._id,
      beforeChange: () => {
        this.saveState('beforeChange');
      },
      changed: () => {
        console.log('changed', this._tick)
        // this.tick++;
        this.forceUpdate()
      },
      activeBlock: this.state.activeBlock,
      onClickAddBlock: (e, block) => {
        /*const parent = findBlockParent(this.blockManager, block._id);
        let blocks;
        if (parent) {
          blocks = parent.children;
        }
        else {
          blocks = this.getBlocks();

        }

        const newBlock = XObject.obj();
        const index = blocks.indexOf(block);
        blocks.splice(e.altKey ? index : index + 1, 0, newBlock);
        this.forceUpdate();*/
      },
      onContextMenu: (e, block) => {
        e.preventDefault();
        showContextMenu(e, [
          {
            text: 'Delete',
            onClick: () => {
              removeBlock(this.blockManager, block._id);
              this.forceUpdate();
            },
          }
        ])
      },
    }, this.props.renderBlockArgs);
  }

  funcs = [];
  collectFunc(func) {
    this.funcs.push(func);
    return func;
  }

  flatList(block: Block) {
    return flatList(block, this.blockManager);
  }

  constructTree(flatList) {
    return constructTree(this.blockManager, flatList);
  }

  getBlock(id) {
    return findBlock(this.blockManager, id);
  }

  currentBlock() {
    const el = jQuery(window.getSelection().focusNode.parentElement).closest('[data-block-id]')
    const blockId = el.data('block-id');
    return findBlock(this.blockManager, blockId);
  }

  deleteSelection(replaceChar?) {
    return deleteSelection(this.ctx, this.blockManager, replaceChar);
  }

  lastPoses = {};
  updateMetaPos() {
    const lastPoses = this.lastPoses;
    for (const el of jQuery(this.wrapperEl.current).find('.meta')) {
      let top, left;
      const blockEl = jQuery(el).parent();
      const blockId = blockEl.attr('data-block-id');
      const editorEl = jQuery(blockEl).find('.editor');
      if (editorEl.find('[data-terminal]').length) {
        top = 2;
        left = editorEl.find('[data-terminal]')[0].offsetLeft + 4;
      }
      else {
        left = 8;
        top = 0;
      }

      lastPoses[blockId] = {left, top};

      jQuery(el).css({
        position: 'absolute',
        left,
        top: top + 30/2 - jQuery(el).outerHeight()/2 - 1,
        display: '',
      })

    }
  }

  areas: {
    block: Block,
    side: string,
    action: (block: Block) => void,
    top,
    left, width, height,
  }[] = []
  updateAreas() {
    this.areas = [];
    const iterate = (list: BlocksList, parent) => {
      for (let i = 0; i < list.getLength(); ++ i) {
        const block: Block | BlockColumns = list.get(i) as any;
        if (block instanceof Block) {
          const el = jQuery(`[data-block-id="${block.getId()}"]`)[0];

          // above
          if (i == 0) {
            const offset = jQuery(el).offset();
            this.areas.push({
              block: parent,
              side: 'above',
              action: dropped => {
                console.log(dropped);
                removeBlock(this.blockManager, dropped.getId(), true);
                const parent = findBlockParent(this.blockManager, block.getId());
                const blocks = parent ? parent.getChildren() : this.blockManager.getRootBlocks();
                const index = blocks.indexOf(block);
                blocks.splice(index, 0, dropped);
                this.dragging = null;
  
                this.forceUpdate();
              },
              top: offset.top + 1,
              left: offset.left + 1,
              width: jQuery(el).width() - 2,
              height: jQuery(el).height()/2 - 2,
            })
          }
  
          // below
          {
            const blockCont = jQuery(el).parents('[data-type="blockCont"]');
            const offset = jQuery(el).offset();
            this.areas.push({
              block: parent,
              side: 'below',
              action: b => {
                removeBlock(this.blockManager, b.getId(), true);
                const parent = findBlockParent(this.blockManager, block.getId());
                const blocks = parent ? parent.getChildren() : this.blockManager.getRootBlocks();
                const index = blocks.indexOf(block);
                blocks.splice(index + 1, 0, b);
                this.dragging = null;
                this.forceUpdate();
              },
  
              top: offset.top + jQuery(blockCont).outerHeight()/2 + 1,
              left: offset.left + 1,
              width: jQuery(el).width() - 2,
              height: jQuery(blockCont).outerHeight()/2 - 2,
            });
          }
  
          // child
          if (!block.isCollapsed()) {
            const offset = jQuery(el).offset();
            this.areas.push({
              block,
              side: 'below',
              action: b => {
                removeBlock(this.blockManager, b.getId(), true);
                const blocks = block.getChildren();
                blocks.splice(0, 0, b);
                this.dragging = null;
                this.forceUpdate();
              },
  
              top: offset.top + 30/2 + 1,
              left: offset.left + 1 + 24,
              width: jQuery(el).width() - 2 - 24,
              height: 30/2 - 2,
            });
            block.hasChildren() && iterate(block.getChildren(), block);
          }
  
  
          // left
          if (!parent) {
            const blockCont = jQuery(el).parents('[data-type="blockCont"]');
            const offset = blockCont.offset();
            this.areas.push({
              block: parent,
              side: 'left',
              action: b => {
                removeBlock(this.blockManager, b.getId(), true);
                const blocks = this.blockManager.getRootBlocks();
                blocks.createColumns(block, b, 'left');
                this.dragging = null;
                this.forceUpdate();
              },
  
              top: offset.top,
              left: offset.left - 10,
              width: 10,
              height: blockCont.height(),
            });
          }
  
          // right
          if (!parent) {
            const blockCont = jQuery(el).parents('[data-type="blockCont"]');
            const offset = blockCont.offset();
            this.areas.push({
              block: parent,
              side: 'right',
              action: b => {
                removeBlock(this.blockManager, b.getId(), true);
                const blocks = this.blockManager.getRootBlocks();
                blocks.createColumns(block, b, 'right');
                this.dragging = null;
                this.forceUpdate();
  
              },
  
              top: offset.top,
              left: offset.left + blockCont.width(),
              width: 10,
              height: blockCont.height(),
            });
          }
        }
        else if (block instanceof BlockColumns) {
          const el = jQuery(`[data-block-columns-id="${block.getId()}"]`)[0];
          console.log(el);

          // above
          if (i == 0) {
            const offset = jQuery(el).offset();
            this.areas.push({
              block: parent,
              side: 'above',
              action: dropped => {
                let index;
                const col = this.blockManager.getBlockColumn(dropped.getId());
                const blocks = this.blockManager.getRootBlocks();

                if (col?.[0]?.getId?.() === block.getId()) {
                  index = blocks.indexOf(block as any);
                }

                removeBlock(this.blockManager, dropped.getId(), true);

                if (_.isNil(index)) index = blocks.indexOf(block as any);
                blocks.splice(index, 0, dropped);
                this.dragging = null;
  
                this.forceUpdate();
              },
              top: offset.top + 1,
              left: offset.left + 1,
              width: jQuery(el).width() - 2,
              height: 10,
            })
          }
  
          // below
          {
            const offset = jQuery(el).offset();
            this.areas.push({
              block: parent,
              side: 'below',
              action: dropped => {
                let index;
                const col = this.blockManager.getBlockColumn(dropped.getId());
                const blocks = this.blockManager.getRootBlocks();

                if (col?.[0]?.getId?.() === block.getId()) {
                  index = blocks.indexOf(block as any);
                }

                removeBlock(this.blockManager, dropped.getId(), true);

                if (_.isNil(index)) index = blocks.indexOf(block as any);
                blocks.splice(index + 1, 0, dropped);
                this.dragging = null;
  
                this.forceUpdate();

              },
  
              top: offset.top + jQuery(el).outerHeight() - 10,
              left: offset.left + 1,
              width: jQuery(el).width() - 2,
              height: 10,
            });
          }
          for (const col of block.getColumns()) {
            iterate(col.getChildren(), col);
          }
        }
      }

    }
    iterate(this.blockManager.getRootBlocks(), null);
    console.log(this.areas);
  }

  doTick() {
    this._tick ++;
    this.hideOverays = true;
    this.forceUpdate();
  }

  saveState(action, e?) {
    // TODO: reimplement

    // this.history.push({
    //   _id: XObject.id(),
    //   blocks: _.cloneDeep(x(this.getBlocks())),
    //   selection: getBlockSelection(),
    //   action,
    //   e,
    // })

    // console.log('saveState', this.historyIndex = this.history.length - 1, e?.key);
  }

  timerId
  undo() {

    // TODO: reimplement
    /*if (!this.history[this.historyIndex]) {
      console.log('no undo history');
      return;
    }


    const entry = this.history[this.historyIndex];
    console.log('undo', entry.action);

    this.setBlocks(X(entry.blocks));
    const selection = entry.selection;
    this.doTick();
    this.historyIndex --;

    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      try {
        setCaretToBlockSelection(selection);
      }
      catch (e) {
        console.log(entry);
        console.log(selection);
        console.log(e);
      }
    }, 1);*/
  }

  presentMenu({ block, left, top, endLength, position, type }) {
    const cont = jQuery('<div />').css({
      position: 'absolute',
      left,
      top,
      zIndex: 9999999,
    });
    jQuery('body').append(cont);
    const root = ReactDOMClient.createRoot(cont[0]);
    root.render(
      <Menu
        ref={this.menuRef}
        type={type}
        menuIniters={this.props.menuIniters}
      />
    );
    this.showMenu = {
      root,
      cont,
      selection: getBlockSelection(this.ctx),
      position,
      endLength,
    }
  }

  closeMenu() {
    this.menuRef.current.close(() => {
      this.showMenu.root.unmount();
      this.showMenu.cont.remove();
      delete this.showMenu;
    })
  }

  hideOverlay() {
    this.hideOverays = true;
    jQuery(this.wrapperEl.current).addClass('hideOverlays');;
  }

  timerIds = {};
  save(from) {
    const el = jQuery(window.getSelection().focusNode).closest('[data-block-id]')

    const blockId = el.data('block-id');

    const block = findBlock(this.blockManager, blockId);

    if (!block) {
      console.log('no block found', blockId, el, window.getSelection().focusNode, from);
      return;
    }

    if (!block.hasContent()) return

    const editorEl = el.find('.editor');

    if (editorEl.html() == '<br>') {
      editorEl.html('');
    }
    block.setContent(extractFromEl(this.ctx, editorEl[0]));
  }

  render(Container?) {
    return (
      <ThemeProvider theme={{ mode: 'light' }}>
        <Container>
          <div
            key={this._tick}
            className={classNames('wrapper', {
              hideOverlays: this.hideOverays,
              inline: true,
            })}
            suppressContentEditableWarning
            contentEditable
            spellCheck={false}
            ref={e => {
              if (e) {
                this.wrapperEl.current = e;
                e.scrollTop = this.currentScroll;
              }
            }}
            onMouseMove={e => {
              this.hideOverays = false;
              jQuery(e.currentTarget).removeClass('hideOverlays');
            }}
            onKeyDown={async e => {
              if (isOnTitle()) return;
              const hasSelection = !window.getSelection().isCollapsed;
              const el = jQuery(window.getSelection().focusNode.parentElement).closest('[data-block-id]')
              const blockId = el.data('block-id');

              this.position = getPositionInBlock(this.ctx);

              const block = findBlock(this.blockManager, blockId);
              if (!block) {
                console.log('no block found', blockId, el, window.getSelection().focusNode);
                return;
              }
              if (!block.hasContent()) return;


              if (e.key == 'z' && e.metaKey) {
                e.preventDefault();
                this.undo();
              }
              else if (Object.keys(this.props.menuIniters).includes(e.key)) {
                let left, top, height;
                const position = getPositionInBlock(this.ctx);
                this.menuPos = position;
                if (position > 0) {
                  ({ left, top, height } = window.getSelection().getRangeAt(0).getBoundingClientRect());

                }
                else {
                  left = el.offset().left;
                  top = el.offset().top;
                  height = el.height();
                }

                this.presentMenu({
                  left,
                  top: top + height,
                  position,
                  endLength: el.children('[data-type="blockData"]').text().length - position,
                  block,
                  type: e.key,
                });
                this.letNextInsert = true;
              }
              else if (e.key === 'Enter') {
                e.preventDefault();
                console.log('enter');
                if (this.showMenu) {
                  const option = this.menuRef.current.enter();
                  if (option) {
                    this.saveState('action');
                    await option.action(block, this.menuPos);
                    delete this.menuPos;
                  }

                  const selection = this.showMenu.selection;
                  this.ignoreEnter = true;
                  
                  this.doTick();
                  setTimeout(() => {
                    setCaretToBlockSelection(this.ctx, selection);
                  }, 1)


                  this.closeMenu();

                }
                else if (isOnTitle()) {
                  console.log('enter on title');
                }
                else {
                  let currentBlock: Block;
                  this.saveState('enter');
                  if (hasSelection && isMultiBlockSelection()) {
                    const firstBlock = getSelectedBlockIds()[0];
                    const pos = getBlockSelection(this.ctx).find(b => b.blockId == firstBlock).position;
                    this.deleteSelection();
                    currentBlock = executeEnter(this.ctx, this.blockManager, firstBlock, pos, e);
                  }
                  else {
                    currentBlock = executeEnter(this.ctx, this.blockManager, blockId, getPositionInBlock(this.ctx), e);
                  }

                  this.forceUpdate();

                  setTimeout(() => {
                    setCaretToBlockSelection(this.ctx, [
                      { blockId: currentBlock.getId(), position: 0 },
                      { blockId: currentBlock.getId(), position: 0}
                    ]);
                    jQuery(`[data-block-id="${currentBlock.getId()}"]`)[0].scrollIntoViewIfNeeded(false);
                  }, 0);
                }

              }
              else if (e.key == 'Tab') {
                this.saveState('indentation');
                const blockSelection = getBlockSelection(this.ctx);
                this.hideOverlay();

                e.preventDefault();
                if (hasSelection) {
                  const el = document.createElement('div');
                  el.innerHTML = getSelectionHtml();
                  const blockEls = jQuery(el).find('[data-block-id]');
                  const blockIds = blockEls.toArray().map(el => jQuery(el).data('block-id')).filter(id => {
                    return e.shiftKey ? canUnindentBlock(this.blockManager, id) : canIndentBlock(this.blockManager, id);
                  });

                  let lowest;
                  const indentLevels = {};
                  for (const blockId of blockIds) {
                    indentLevels[blockId] = getBlockIndentation(this.blockManager, blockId);
                    if (lowest === undefined || indentLevels[blockId] < lowest) {
                      lowest = indentLevels[blockId];
                    }
                  }

                  if (e.shiftKey) {
                    blockIds.reverse();
                    for (const blockId of blockIds) {
                      if (indentLevels[blockId] === lowest) {
                        unindentBlock(this.blockManager, blockId);
                      }
                    }
                  }
                  else {
                    for (const blockId of blockIds) {
                      if (indentLevels[blockId] === lowest) {
                        indentBlock(this.blockManager, blockId);
                      }
                    }
                  }
                }
                else {
                  if (e.shiftKey) {
                    unindentBlock(this.blockManager, blockId);
                    this.forceUpdate();
                  }
                  else {
                    indentBlock(this.blockManager, blockId);
                  }
                }
                this.forceUpdate();

                setTimeout(() => {
                  setCaretToBlockSelection(this.ctx, blockSelection);

                }, 1);
                

              }
              else if (e.key === 'ArrowDown') {
                if (this.showMenu) {
                  this.menuRef.current.down();
                  e.preventDefault();
                }
              }
              else if (e.key === 'ArrowUp') {
                if (this.showMenu) {
                  this.menuRef.current.up();
                  e.preventDefault();

                }
              }
              else if (e.key == 'ArrowLeft') {
                if (getPositionInBlock(this.ctx) == 0) {
                  e.preventDefault();
                  const flatList = this.flatList(block);
                  const index = flatList.findIndex(b => b._id == blockId);

                  const prevBlockId = flatList[index - 1]?._id;

                  const prevBlock = findBlock(this.blockManager, prevBlockId);
                  const length = dataLength(this.ctx, prevBlock.getContent());

                  const pos = {
                    blockId: prevBlock.getId(),
                    position: length,
                  }
                  setCaretToBlockSelection(this.ctx, [pos, pos]);

                }
              }
              else if (e.key == 'ArrowRight') {
                if (getPositionInBlock(this.ctx) == dataLength(this.ctx, block.getContent())) {
                  e.preventDefault();
                  const flatList = this.flatList(block);
                  const index = flatList.findIndex(b => b._id == blockId);
                  
                  const nextBlockId = flatList[index + 1]?._id;

                  const pos = {
                    blockId: nextBlockId,
                    position: 0,
                  }
                  setCaretToBlockSelection(this.ctx, [pos, pos]);
                }
              }
              else if (e.key == 'Backspace') {
                if (hasSelection) {
                  console.log('delete selection');
                  e.preventDefault();
                  this.saveState('deleteSelection');
                  if (this.deleteSelection()) {
                    this.save('delete');
                  }
                  this.doTick();
                }
                else if (this.position == 0) {
                  if (block.handlesBackspaceAtStart()) {
                    console.log('remove type', el, blockId, block);
                    const blockSelection = getBlockSelection(this.ctx);
                    block.handleBackspaceAtStart();
                    this.doTick();
                    e.preventDefault();
                    setTimeout(() => {
                      setCaretToBlockSelection(this.ctx, blockSelection);
                    }, 5);
                  }
                  else {
                    this.saveState('backspace');

                    let action: 'unindent' | 'merge' = null;
                    if (getBlockIndentation(this.blockManager, blockId) == 0) {
                      action = 'merge';
                    }
                    else {
                      const parent = findBlockParent(this.blockManager, blockId);
                      const positionInParent = parent?.getChildren()?.indexOf(block);
                      if (positionInParent == 0) {
                        if (parent.getChildren().getLength() > 1) {
                          action = 'merge';
                        }
                        else if (parent.getChildren().getLength() == 1) {
                          action = 'unindent';
                        }
                      }
                      else {
                        const flatList = this.flatList(block);

                        const index = flatList.findIndex(b => b._id == blockId);
                        const flatBlock = flatList[index];
                        const prevFlatBlock = flatList[index - 1];
                        if (prevFlatBlock && prevFlatBlock.indentationLevel == flatBlock.indentationLevel) {
                          action = 'merge';
                        }
                        else {
                          action = 'unindent';
                        }
                      }
                    }

                    if (action == 'unindent') {
                      console.log('unindent')
                      const blockSelection = getBlockSelection(this.ctx);
                      e.preventDefault();
                      unindentBlock(this.blockManager, blockId);
                      this.doTick();
                      setTimeout(() => {
                        setCaretToBlockSelection(this.ctx, blockSelection);
                      }, 5);
                    }
                    else if (action == 'merge') {
                      console.log('remove block')
                      e.preventDefault();

                      const flatList = this.flatList(block);
                      const index = flatList.findIndex(b => b._id == blockId);
                      const prevBlockId = flatList[index - 1]?._id;
                      if (prevBlockId) {
                        const prevBlock: any = findBlock(this.blockManager, prevBlockId);
                        if (prevBlock instanceof Block) {
                          const length = dataLength(this.ctx, prevBlock.getContent());
                          prevBlock.setContent(X(concatData(this.ctx, prevBlock.getContent(), block.getContent())));

                          if (findBlockParent(this.blockManager, blockId)?.getId?.() != prevBlock.getId()) {
                            prevBlock.setChildren(block.getChildren());
                          }
                          else if (block.hasChildren()) {
                            prevBlock.setChildren(block.getChildren().concat(prevBlock.getChildren()));
                          }
                          const pos = {
                            blockId: prevBlock.getId(),
                            position: length,
                          }
                          removeBlock(this.blockManager, blockId);
                          this.doTick();
                          setTimeout(() => {
                            setCaretToBlockSelection(this.ctx, [pos, pos]);
                          }, 1)
                        }
                        else if (prevBlock instanceof BlockColumns) {
                          console.log(prevBlock);
                          removeBlock(this.blockManager, blockId);
                          this.doTick();

                          // TODO: merge contents of block with prevBlock
                        }
                        else {
                          throw new Error('unknown block type');
                        }
                      }
                      else {
                        console.log('no prev block');
                        const col = this.blockManager.getBlockColumn(blockId);
                        if (col) {
                          const blockColumns = col[0];
                          if (blockColumns.getColumns().length == 2 && col[1] == 1) {
                            console.log('unwrap columns');
                            const rootBlocks = this.blockManager.getRootBlocks();
                            const index = rootBlocks.indexOf(blockColumns as any);
                            console.log(index);

                            const list = blockColumns.getColumns()[0].getChildren();

                            rootBlocks.splice(index, 1, ...list.getArray());
                            this.doTick();

                            // TODO: merge contents of block with first block of list
                          }
                          else if (blockColumns.getColumns().length > 2) {
                            console.log('merge columns');
                          }
                        }
                      }
                    }
                  }
                }
                else {
                  if (!_.isNil(this.menuPos) && _.isEqual(getPositionInBlock(this.ctx) - 1, this.menuPos)) {
                    this.closeMenu();
                  }
                  this.saveState('delete');
                }
              }
              else {
                if (e.key.length == 1 && !e.metaKey) {
                  if (hasSelection && isMultiBlockSelection()) {
                    e.preventDefault();
                    this.saveState('deleteSelection');
                    this.deleteSelection(e.key);
                    this.doTick();
                  }
                  else {
                    // this.saveState('insert', e);
                  }
                }
                // console.log(block._id, editorEl[0])
              }

              // if (!e.metaKey) {
              //   if (!window.getSelection().isCollapsed) {
              //     setTimeout(() => {
              //       this.resyncDataWithDom();
              //     }, 0);
                  
              //   }
      
              // }
            }}
            onKeyUp={e => {
              const el = jQuery(window.getSelection().focusNode).closest('[data-block-id]')
              const blockId = el.data('block-id');
              const block = findBlock(this.blockManager, blockId);
              // console.log('keyup', e.key, blockId, block, window.getSelection().focusNode);
              // e.preventDefault();
              // return;

              /*const save = () => {
                if (!block) {
                  console.log('no block found', blockId, el, window.getSelection().focusNode);
                  return;
                }
                // console.log('save', blockId, block)
                const editorEl = el.find('.editor');
                // console.log(editorEl[0]);

                if (editorEl.html() == '<br>') {
                  editorEl.html('');
                }

                block.data = extractFromEl(editorEl[0]);
                if (block.id) {
                  const entity = db.entities.findById(block.id);
                  if (entity) {
                    XObject.withPass({ internal: block._id }, () => {
                      entity.name = dataToString(block.data || []);
                      // console.log('set name', entity.name)
                    });
                  }
                }
                else if (block.record) {
                  const db = new DB(this.props.database);
                  const titleCol = db.titleCol();
                  const record = db.getRecord(block.record);
                  if (record) {
                    XObject.withPass({ internal: block._id }, () => {
                      record.data[titleCol._id] = X(x(block.data))[0] || '';
                    });
                  }
                }
              }*/

              if (e.key == 'Escape') {
                if (this.showMenu) {
                  this.save('input');
                  this.menuRef.current.close(() => {
                    this.showMenu.root.unmount();
                    this.showMenu.cont.remove();
                    delete this.showMenu;  
                  });
                }
              }

              else if (!e.metaKey) {
                if (!this.showMenu) {
                  if (e.key == 'Enter' && this.ignoreEnter) {
                    delete this.ignoreEnter;
                    e.preventDefault();
                  }
                  // else {
                  //   this.save();
                  // }
                }
                else if (this.letNextInsert) {
                  delete this.letNextInsert;
                }
                else {
                  const text = el.children('[data-type="blockData"]').text();
                  console.log(text, this.showMenu.position, this.showMenu.endLength, text.slice(this.showMenu.position + 1, text.length - this.showMenu.endLength));
                  this.menuRef.current.setFilter(text.slice(this.showMenu.position + 1, text.length - this.showMenu.endLength));
                }
              }
            }}
            onScroll={e => {
              this.currentScroll = (e.target as any).scrollTop;
            }}
          >
            {this.props.setTitle && <div data-type="title" className="title">{this.title}</div>}
            {(
              <>
                <div
                  ref={e => {
                    if (e){ 
                      if (!this.initial) {
                        this.updateMetaPos();          
                        this.initial = true;
                      }
                    }
                  }}
                  key={this._tick}
                >
                  {this.blockManager.getRootBlocks().map((b: Block | BlockColumns, i) => {
                    if (b instanceof Block) {
                      return this.renderBlock(b);
                    }
                    else if (b instanceof BlockColumns) {
                      return (
                        <div
                          data-block-columns-id={b.getId()}
                          key={b.getId()}
                          style={{
                            display: 'flex',
                            padding: '10px 0',
                          }}
                        >
                          {b.getColumns().map((col, i) => {
                            return (
                              <div
                                key={col.getId()}
                                style={{
                                  flex: '1 1 0',
                                }}
                              >
                                {col.getChildren().map(b => {
                                  return this.renderBlock(b);
                                })}
                              </div>
                            )
                          })}
                        </div>
                      )
                    }
                  })}
                </div>
                {this.showMenu && (
                  <>
                    <div
                      className="menu"
                      style={{
                        position: 'absolute',
                        top: this.showMenu.top,
                        left: this.showMenu.left,
                      }}
                    >

                    </div>
                  </>
                )}
                {this.dragging && this.areas.map((area, i) => {
                  let offset = {left: 0, top: 0 };

                  if (this.props.insidePositionContext) {
                    offset = jQuery(ReactDOM.findDOMNode(this)).offset();
                  }
                  return (
                    <div
                      contentEditable={false}
                      key={i}
                      data-index={i}
                      className={classNames('dragArea', area.side)}
                      style={{
                        position: 'fixed',
                        top: area.top - offset.top,
                        left: area.left - offset.left,
                        width: area.width,
                        height: area.height,
                        zIndex: 9999999999,
                      }}
                      // onMouseDown={e => {
                      //   e.preventDefault();
                      //   e.stopPropagation();
                      //   console.log('area', area);
                      //   area.action(this.dragging);
                      // }}
                    ></div>
                  )
                })}
              </>
            )}
          </div>
        </Container>
      </ThemeProvider>
    );
  }
}
