'use client';

import { TextField, InputAdornment, type SxProps, type Theme } from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { tokens } from '@/theme/admin-tokens';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  sx,
}: SearchInputProps) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        width: { xs: '100%', sm: 300 },
        '& .MuiOutlinedInput-root': {
          borderRadius: 0,
        },
        ...sx,
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlinedIcon sx={{ fontSize: 19, color: tokens.color.textMuted }} />
            </InputAdornment>
          ),
          sx: {
            height: 44,
            pl: 1.25,
            bgcolor: tokens.color.inputBg,
            borderRadius: 0,
            fontSize: 14,
            '& input::placeholder': {
              fontSize: 14,
            },
          },
        },
      }}
    />
  );
}
