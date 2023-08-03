import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";

interface Iprops {
  codeString: string;
  onChange: (e: any) => void;
}

export const CodeMirrorInput: React.FC<Iprops> = props => {
  const { codeString, onChange } = props;
  return (
    <CodeMirror
      minHeight="100px"
      maxHeight="100px"
      className="cm-outer-container"
      value={codeString}
      extensions={[javascript(), EditorView.lineWrapping]}
      onChange={onChange}
      theme={"dark"}
    />
  );
};

export default CodeMirrorInput;
