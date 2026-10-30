import { useState } from 'react';

// TEMPORARY (milestone 5, step 4 lesson): shows why index keys break once a
// list can change. Delete this file and its route in App.tsx afterwards.

const startItems = [
    { id: 'a', text: '2 cups flour' },
    { id: 'b', text: '3 eggs' },
    { id: 'c', text: '1 cup milk' },
];

function KeyDemo() {
    const [items, setItems] = useState(startItems);
    const [useIndexKeys, setUseIndexKeys] = useState(true);

    function removeFirst() {
        setItems((prev) => prev.slice(1));
    }

    // Swap the item at `index` with the one above it.
    function moveUp(index: number) {
        setItems((prev) => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
        });
    }

    return (
        <div className="container">
            <h1>Key demo</h1>
            <label>
                <input
                    type="checkbox"
                    checked={useIndexKeys}
                    onChange={(e) => setUseIndexKeys(e.target.checked)}
                />
                {' '}Use index keys (untick to use item ids)
            </label>

            <ul>
                {items.map((item, idx) => (
                    <li key={useIndexKeys ? idx : item.id}>
                        {/* Uncontrolled: React doesn't track whether this is
                            ticked. The browser's DOM element remembers it. */}
                        <input type="checkbox" /> {item.text}{' '}
                        <button onClick={() => moveUp(idx)} disabled={idx === 0}>
                            Move up
                        </button>
                    </li>
                ))}
            </ul>

            <button onClick={removeFirst}>Remove first</button>
            <p>Reload the page (F5) to start over.</p>
        </div>
    );
}

export default KeyDemo;
