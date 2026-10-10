import React, { useId } from 'react';
import { Check } from 'lucide-react';

export default function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  className = '',
  id: customId,
  ...props
}) {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <label htmlFor={id} className={`checkbox-container ${disabled ? 'disabled' : ''} ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="checkbox-input"
        {...props}
      />
      <span className="checkbox-custom" aria-hidden="true">
        {checked && <Check size={14} className="checkbox-icon" />}
      </span>
      {label && <span className="checkbox-label">{label}</span>}
    </label>
  );
}
