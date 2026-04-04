interface VarProps {
  name: string;
}

const Var = ({ name }: VarProps) => (
  <span className="variable-text">{`{{${name}}}`}</span>
);

export default Var;
