import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LocationSelector from '../LocationSelector';

describe('LocationSelector Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render location selector with label', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      expect(
        screen.getByText(/Please select your Prep Doctors location/i)
      ).toBeInTheDocument();
    });

    test('should render all five location options', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByLabelText('Mississauga')).toBeInTheDocument();
      expect(screen.getByLabelText('Calgary')).toBeInTheDocument();
      expect(screen.getByLabelText('Vancouver')).toBeInTheDocument();
      expect(screen.getByLabelText('Montreal')).toBeInTheDocument();
      expect(screen.getByLabelText('Richmond Hill')).toBeInTheDocument();
    });

    test('should render red asterisk when required', () => {
      const { container } = render(
        <LocationSelector value={null} onChange={mockOnChange} required />
      );

      const asterisk = container.querySelector('.text-red-500');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveTextContent('*');
    });

    test('should not render asterisk when not required', () => {
      const { container } = render(
        <LocationSelector value={null} onChange={mockOnChange} required={false} />
      );

      const asterisk = container.querySelector('.text-red-500');
      expect(asterisk).not.toBeInTheDocument();
    });

    test('should render radio buttons with correct type', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(5);
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('type', 'radio');
      });
    });

    test('should have same name attribute for all radio buttons', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'location');
      });
    });
  });

  describe('Selection Behavior', () => {
    test('should check the radio button matching the value prop', () => {
      render(
        <LocationSelector value="mississauga" onChange={mockOnChange} />
      );

      const mississaugaRadio = screen.getByLabelText('Mississauga');
      expect(mississaugaRadio).toBeChecked();

      const calgaryRadio = screen.getByLabelText('Calgary');
      expect(calgaryRadio).not.toBeChecked();
    });

    test('should check correct radio for each valid location', () => {
      const locations = [
        { value: 'mississauga', label: 'Mississauga' },
        { value: 'calgary', label: 'Calgary' },
        { value: 'vancouver', label: 'Vancouver' },
        { value: 'montreal', label: 'Montreal' },
        { value: 'richmond_hill', label: 'Richmond Hill' }
      ];

      locations.forEach(location => {
        const { unmount } = render(
          <LocationSelector value={location.value} onChange={mockOnChange} />
        );

        const radio = screen.getByLabelText(location.label);
        expect(radio).toBeChecked();

        // Other radios should not be checked
        const allRadios = screen.getAllByRole('radio');
        const otherRadios = allRadios.filter(r => r !== radio);
        otherRadios.forEach(otherRadio => {
          expect(otherRadio).not.toBeChecked();
        });

        unmount();
      });
    });

    test('should call onChange with correct value when radio is clicked', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      const calgaryRadio = screen.getByLabelText('Calgary');
      fireEvent.click(calgaryRadio);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('calgary');
    });

    test('should update selection when different radio is clicked', () => {
      const { rerender } = render(
        <LocationSelector value="mississauga" onChange={mockOnChange} />
      );

      const vancouverRadio = screen.getByLabelText('Vancouver');
      fireEvent.click(vancouverRadio);

      expect(mockOnChange).toHaveBeenCalledWith('vancouver');

      // Simulate parent component updating the value prop
      rerender(
        <LocationSelector value="vancouver" onChange={mockOnChange} />
      );

      expect(vancouverRadio).toBeChecked();
      expect(screen.getByLabelText('Mississauga')).not.toBeChecked();
    });

    test('should handle onChange event with correct value for all locations', () => {
      const { rerender } = render(
        <LocationSelector value={null} onChange={mockOnChange} />
      );

      const locations = [
        { value: 'mississauga', label: 'Mississauga' },
        { value: 'calgary', label: 'Calgary' },
        { value: 'vancouver', label: 'Vancouver' },
        { value: 'montreal', label: 'Montreal' },
        { value: 'richmond_hill', label: 'Richmond Hill' }
      ];

      locations.forEach((location, index) => {
        jest.clearAllMocks();
        const radio = screen.getByLabelText(location.label);
        fireEvent.click(radio);

        expect(mockOnChange).toHaveBeenCalledTimes(1);
        expect(mockOnChange).toHaveBeenCalledWith(location.value);
      });
    });
  });

  describe('Form Validation', () => {
    test('should have required attribute when required prop is true', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} required />);

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).toBeRequired();
      });
    });

    test('should not have required attribute when required prop is false', () => {
      render(
        <LocationSelector value={null} onChange={mockOnChange} required={false} />
      );

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).not.toBeRequired();
      });
    });

    test('should work within a form element', () => {
      const handleSubmit = jest.fn(e => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <LocationSelector
            value="mississauga"
            onChange={mockOnChange}
            required
          />
          <button type="submit">Submit</button>
        </form>
      );

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('should associate labels with radio inputs', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      const locations = [
        'Mississauga',
        'Calgary',
        'Vancouver',
        'Montreal',
        'Richmond Hill'
      ];

      locations.forEach(location => {
        const radio = screen.getByLabelText(location);
        expect(radio).toBeInTheDocument();
        expect(radio.tagName).toBe('INPUT');
      });
    });

    test('should have proper radio button roles', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(5);
    });

    test('should allow keyboard navigation', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      const firstRadio = screen.getByLabelText('Mississauga');
      firstRadio.focus();

      expect(document.activeElement).toBe(firstRadio);
    });
  });

  describe('Styling', () => {
    test('should have correct CSS classes for layout', () => {
      const { container } = render(
        <LocationSelector value={null} onChange={mockOnChange} />
      );

      const radioContainer = container.querySelector('.grid.grid-cols-2');
      expect(radioContainer).toBeInTheDocument();
    });

    test('should apply card styling to location options', () => {
      const { container } = render(
        <LocationSelector value="mississauga" onChange={mockOnChange} />
      );

      // Check that there are 5 clickable card-style location options
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons.length).toBe(5);

      // Radio inputs should be visually hidden but still accessible
      radioButtons.forEach(radio => {
        expect(radio).toHaveClass('sr-only');
      });

      // Check for card-style container
      const gridContainer = container.querySelector('.grid.grid-cols-2');
      expect(gridContainer.children.length).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null value prop', () => {
      render(<LocationSelector value={null} onChange={mockOnChange} />);

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });

    test('should handle undefined value prop', () => {
      render(<LocationSelector value={undefined} onChange={mockOnChange} />);

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });

    test('should handle empty string value prop', () => {
      render(<LocationSelector value="" onChange={mockOnChange} />);

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });

    test('should not break with invalid value prop', () => {
      render(
        <LocationSelector value="invalid_location" onChange={mockOnChange} />
      );

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });
  });
});
