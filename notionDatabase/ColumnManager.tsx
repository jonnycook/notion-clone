import { CellType } from "./CellType";


export abstract class Column {
  width(): any { }
  setWidth(value) { }
  type(): any { }
  id(): any { }
  metaData(): any { }

  title(): any { }
  setTitle(value) { }

  cellObj(row): CellType {
    throw new Error("Method not implemented.");
  }

  getIcon() {

  }
}

export abstract class ColumnManager {
  abstract columns(): Column[];

  addColumn() {
  }

  deleteColumn(id) {
  }

  move(oldIndex, newIndex) {

  }

  canAddDeleteColumns: boolean;

}

export abstract class Row {
  abstract id(): any;
  abstract value(colId, defaultValue?, context?): any;
  abstract setValue(colId, value): any;
}

export abstract class RowManager {
  abstract rows(): Row[];
  abstract addRow(): any;
  abstract deleteRow(id): any;
  abstract canAddDeleteRows: boolean;
}
