import _ from "lodash";

export type DataArray = any[];
export type Data = DataArray | string;

export type DataCtx = {
  types: any;
};

// DATA FUNCS
function contractFromHtml(html) {
  return [];
}

export function extractFromEl(ctx: DataCtx, el: HTMLElement): Data {
  const { types } = ctx;
  const parts = [];
  const processeEl = (el: HTMLElement, styles = []) => {
    if (el) {

      if (!el.getAttribute?.('data-terminal')) {
        if (el.nodeType === Node.TEXT_NODE) {
          parts.push([el.textContent, ...(styles.length ? [styles] : [])]);
        }

        if (el.nodeType === Node.ELEMENT_NODE) {
          const t = types[el.getAttribute('data-type')];
          if (t) {
            parts.push(t.part(el));
          }
          else if (el.tagName == 'B') {
            processeEl(el.firstChild as HTMLElement, _.uniq([...styles, 'b']));
          }
          else if (el.tagName == 'I') {
            processeEl(el.firstChild as HTMLElement, _.uniq([...styles, 'i']));
          }
          else if (el.tagName == 'U') {
            processeEl(el.firstChild as HTMLElement, _.uniq([...styles, 'u']));
          }
        }
      }

      processeEl(el.nextSibling as HTMLElement, styles);
    }
  };
  processeEl(el.firstChild as HTMLElement);

  let plainText = true;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length != 1) {
      plainText = false;
      break;
    }
  }

  if (plainText) {
    return parts.map(p => p[0]).join('');
  }

  return parts;
}


export function expandToHtml(ctx: DataCtx, data: Data, comps = {}, args?) {
  if (_.isString(data)) {
    return data + `<span data-terminal="true" />`;
  }
  const { types } = ctx;
  let html = '';

  const currentStyles = [];
  try {
    for (const part of data) {
      if (!part) continue;
      if (_.isString(part)) {
        html += part;
      }
      else {
        const t = types[part[1]];
        if (t) {
          for (const style of currentStyles) {
            html += `</${style}>`;
          }
          currentStyles.splice(0, currentStyles.length);
          html += t.html(part[0], comps, args);
        }
        else {
          const [text, styles = []] = part;
          const newStyles = _.difference(styles, currentStyles);
          const removedStyles = _.difference(currentStyles, styles);
          for (const style of newStyles) {
            html += `<${style}>`;
          }
          for (const style of removedStyles) {
            html += `</${style}>`;
          }
          html += text;
          currentStyles.splice(0, currentStyles.length, ...styles);
        }
      }

    }
  }
  catch (e) {
    console.log(data);
    console.log(e);
    throw e;
  }




  if (html == '<br />') return '';

  html += `<span data-terminal="true" />`

  return html;
}

export function expandToText(ctx: DataCtx, data: Data, comps = {}, args?) {
  if (_.isString(data)) {
    return data;
  }
  if (!data) return '';
  const { types } = ctx;
  let text = '';

  try {
    for (const part of data) {
      if (!part) continue;
      if (_.isString(part)) {
        text += part;
      }
      else {
        const t = types[part[1]];
        if (t) {
          text += t.text(part[0], comps, args);
        }
        else {
          const [str, styles = []] = part;
          text += str;
        }
      }

    }
  }
  catch (e) {
    console.log(data);
    console.log(e);
    throw e;
  }


  if (text == '<br />') return '';

  return text;
}
  

export function createChunked(ctx: DataCtx, data: Data = []): DataArray {
  const { types } = ctx;
  const chunked = [];
  let i = 0;
  for (const part of data) {
    if (_.isString(part)) {
      for (let j = 0; j < part.length; j++) {
        chunked[i + j] = [part[j], []];
      }
      i += part.length;
    }
    else {
      const t = types[part[1]];
      if (t) {
        if (t.type == Type.atomic) {
          chunked[i] = part;
          i++;
        }
        else if (t.type == Type.text) {
          const [str, c] = part;
          for (let j = 0; j < str.length; j++) {
            chunked[i + j] = [str[j], c];
          }
          i += str.length;
        }
      }
      else {
        const [str, styles = []] = part;
        const styleMap = {};
        for (const style of styles) {
          styleMap[style] = true;
        }
        for (let j = 0; j < str.length; j++) {

          chunked[i + j] = [str[j], styleMap];
        }
        i += str.length;

      }
    }
  }

  return chunked;
}

function mergeChunked(ctx: DataCtx, chunked: Data, start: number, end: number): Data {
  const { types } = ctx;
  const slicedData = [];
  let prevStyles = {};
  let curStr = '';

  function fin() {
    if (_.isString(prevStyles) && types[prevStyles]?.type == Type.text) {
      slicedData.push([curStr, prevStyles]);
    }
    else {
      const styles = [];
      for (const style in prevStyles) {
        styles.push(style);
      }
      slicedData.push([curStr, styles]);
    }
  }

  for (let i = start; i < end; i++) {
    const [str, styles] = chunked[i] || ['', {}];
    const t = types[styles];
    if (t) {

      if (t.type == Type.atomic) {
        if (curStr) {
          fin();
          curStr = '';
          prevStyles = {};
        }

        slicedData.push(chunked[i]);
      }
      else if (t.type == Type.text) {
        if (curStr && prevStyles != styles) {
          fin();
          curStr = '';
        }

        curStr += str;
        prevStyles = styles;
      }
    }
    else if (str) {
      if (_.isEqual(prevStyles, styles)) {
        curStr += str;
      }
      else {
        fin();
        curStr = str;
        prevStyles = styles;
      }
    }
  }
  if (curStr) {
    fin();
  }

  return slicedData;
}

export function sliceData(ctx: DataCtx, data: Data, start: number, end: number): Data {
  const chunked = createChunked(ctx, data);
  return mergeChunked(ctx, chunked, start, end);
}

export function dataLength(ctx: DataCtx, data: Data): number {
  const chunked = createChunked(ctx, data);
  return chunked.length;
}

export function concatData(ctx: DataCtx, data: Data, newData: Data): Data {
  const chunked = createChunked(ctx, data).concat(createChunked(ctx, newData));
  return mergeChunked(ctx, chunked, 0, chunked.length);
}

export function dataToString(ctx: DataCtx, data: Data): string {
  const chunked = createChunked(ctx, data);
  let str = '';
  for (const [char] of chunked) {
    str += char;
  }
  return str;
}
export enum Type {
  atomic,
  text
}

export function getPositionInDataEditor(rootEl, which='anchor') {
  const selection = window.getSelection();
  if (!selection[which + 'Node']) return -1;
  let position = selection[which + 'Offset'];

  const node = selection[which + 'Node'];
  if (node == rootEl) {
    return position;
  }

  if (!node) return 0;

  let pos = 0;

  const findNode = n => {
    if (n == node) {
      pos += position;
      return true;
    }
    else if (n.getAttribute?.('data-type') === 'entity') {
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

  findNode(rootEl);

  return pos;
}
