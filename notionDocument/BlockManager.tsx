import { Data } from "../richTextHelpers";

export abstract class BlocksList {
  abstract indexOf(block: Block): number;
  abstract indexOfId(id: string): number;
  abstract splice(index: number, count: number, ...blocks: Block[]): void;
  abstract push(...blocks: Block[]): void;

  abstract setContents(blocks: BlocksList): void;

  abstract concat(blocks: BlocksList): BlocksList;

  abstract get(index: number): Block;
  abstract _set(index: number, block: Block): void;

  abstract getLength(): number;

  abstract map<T>(fn: (block: Block, i) => T): T[];

  abstract getArray(): Block[];

  abstract createColumns(atBlock: Block, newBlock: Block, extendSide: 'left' | 'right');
}
export abstract class BlockManager {
  abstract findBlock(id: string, errorOnNotFound?): Block;
  abstract findBlockParent(id: string): Block;

  abstract getRootBlocks(): BlocksList;
  abstract setRootBlocks(blocks: BlocksList): void;

  abstract newBlock(id?): Block;

  abstract newBlocksList(): BlocksList;

  abstract getBlockColumn(id: string, rootOnly?): [BlockColumns, number];
}


export abstract class Block {
  blockManager: BlockManager;

  abstract getId(): string;
  abstract hasChildren(): boolean;
  abstract getChildren(): BlocksList;
  abstract setChildren(children: BlocksList): any;
  abstract getContent(): Data;
  abstract setContent(content: Data): any;

  abstract hasContent(): boolean;

  abstract isCollapsed(): boolean;

  getParent() {
    return this.blockManager.findBlockParent(this.getId());
  }

  // abstract serializeData(): any;
  // abstract deserializeData(data: any): any;

  abstract serialize(): any;
  abstract deserialize(data: any): any;
  

  abstract syncing(): boolean;

  abstract createBlock(): Block;

  abstract handlesBackspaceAtStart(): boolean;
  handleBackspaceAtStart() {
    
  }

  abstract getRootBlockList(): BlocksList;
}


export abstract class BlockColumn {
  blockManager: BlockManager;
  abstract getId(): string;

  abstract getChildren(): BlocksList;
  abstract hasChildren(): boolean;
}

export abstract class BlockColumns {
  blockManager: BlockManager;
  abstract getId(): string;

  abstract getColumns(): BlockColumn[];
  abstract hasChildren(): boolean;

  abstract removeColumn(i: number): void;
  

  abstract serialize(): any;
  abstract deserialize(data: any): any;
}
