// Props: value, onChange -> (optional)
// Create an array of 5 false booleans
// .map through array, if index < value then set bool as true
// Clicking a star fires onChange, sends index+1 to parent, parent will rerender component with new value
// Display only is set when no onChange is sent in as a prop

type RatingProps = {
    value: number;
    onChange?: (newValue: number) => void;
}

export default function StarRating({ value, onChange }: RatingProps) {
    const isStarFilled: boolean[] = new Array(5).fill(false);

    for (let i = 0; i < isStarFilled.length; i++) {
        if (i < value) {
            isStarFilled[i] = true;
        }
    }

    // Display-only stars are text so should be displayed to not look like controls
    return (
        <div className="star-rating">
            {isStarFilled.map((isFilled, index) => (
                onChange ?
                <button
                    type="button"
                    key={index}
                    onClick={() => onChange(index + 1)}>
                    {isFilled ? '★' : '☆'}
                </button> :
                <span key={index}>{isFilled ? '★' : '☆'}</span>
            ))}
        </div>
    );
}
