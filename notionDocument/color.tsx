import { darkModeBg } from "../../etc/themeState";


export function color(el) {
  return props => {
    if (props.theme.mode == 'dark') {
      if (el == 'bg') {
        return darkModeBg;
      }
      else if (el == 'text') {
        return '#d4d4d4';
      }
      else if (el == 'text.checked') {
        return '#7f7f7f';
      }
      else if (el == 'text.checked.line') {
        return '#7f7f7f';
      }
      else if (el == 'block.actionIcon') {
        return '#5a5a5a';
      }
      else if (el == 'block.entityDot') {
        return '#41a663';
      }
      else if (el == 'block.dataBindingDot') {
        return '#4163a6';
      }

      else if (el == 'block.badge.bg') {
        return '#5c5c5c';

      }
      else if (el == 'block.badge.text') {
        return '#b6b6b6';
      }
      else if (el == 'block.metaLine.text') {
        return '#636363';
      }
      else if (el == 'block.actionIcon.bg') {
        return '#262626';
      }
      else if (el == 'checkbox.hover.bg') {
        return '#262626';
      }


    }
    else if (props.theme.mode == 'light') {
      if (el == 'text.checked') {
        return 'rgba(55, 53, 47, 0.65)';
      }
      else if (el == 'text.checked.line') {
        return 'rgba(55, 53, 47, 0.25)';
      }
      else if (el == 'block.actionIcon') {
        return 'rgba(55, 53, 47, 0.35);';
      }
      else if (el == 'block.entityDot') {
        return '#a5d3b5';
      }
      else if (el == 'block.dataBindingDot') {
        return '#4163a6';
      }
      else if (el == 'block.badge.bg') {
        return 'lightblue';
      }
      else if (el == 'block.badge.text') {
        return 'black';
      }
      else if (el == 'block.metaLine.text') {
        return '#c9c9c9';
      }
      else if (el == 'block.actionIcon.bg') {
        return 'rgba(55, 53, 47, 0.08)';
      }
      else if (el == 'checkbox.hover.bg') {
        return 'rgba(55,53,47,0.08)';
      }



    }
    return 'inherit';
  };
}
