export class CellType {
  id: string;
  defaultValue = undefined;
  constructor(public metaData) {
  }
  showOpenButton() {
    return false;
  }
  renderValue(value, args: any = {}): any { }
  renderEditor({ frame, value, setValue, close, state }): any { }
}
