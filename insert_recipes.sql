INSERT INTO recipes (id, name, description, cook_time, servings, calories, protein, tags, cuisine, category) VALUES
('723e4567-e89b-12d3-a456-426614174006', 'Thai Green Curry', 'Creamy coconut curry with vegetables and Thai basil', 35, 4, 380, 18, ARRAY['curry', 'thai', 'coconut', 'vegetables', 'dinner'], 'Thai', 'vegetarian'),
('823e4567-e89b-12d3-a456-426614174007', 'Spaghetti Carbonara', 'Classic Italian pasta with eggs, cheese, and pancetta', 20, 2, 620, 28, ARRAY['pasta', 'italian', 'eggs', 'cheese', 'dinner'], 'Italian', 'comfort-food'),
('923e4567-e89b-12d3-a456-426614174008', 'Breakfast Burrito', 'Scrambled eggs, cheese, and salsa wrapped in a tortilla', 15, 1, 480, 24, ARRAY['breakfast', 'eggs', 'cheese', 'mexican', 'quick'], 'Mexican', 'breakfast'),
('a23e4567-e89b-12d3-a456-426614174009', 'Grilled Steak Fajitas', 'Sizzling beef strips with peppers and onions', 25, 4, 520, 42, ARRAY['beef', 'steak', 'peppers', 'mexican', 'dinner'], 'Mexican', 'high-protein'),
('b23e4567-e89b-12d3-a456-426614174010', 'Buddha Bowl', 'Quinoa bowl with roasted vegetables and tahini dressing', 30, 2, 420, 16, ARRAY['quinoa', 'vegetables', 'healthy', 'vegan', 'lunch'], 'Mediterranean', 'vegan'),
('c23e4567-e89b-12d3-a456-426614174011', 'Teriyaki Salmon Bowl', 'Glazed salmon over rice with edamame and cucumber', 25, 2, 560, 38, ARRAY['salmon', 'rice', 'fish', 'japanese', 'dinner'], 'Japanese', 'high-protein'),
('d23e4567-e89b-12d3-a456-426614174012', 'Chicken Tikka Masala', 'Tender chicken in creamy tomato curry sauce', 40, 6, 490, 36, ARRAY['chicken', 'curry', 'indian', 'dinner', 'spicy'], 'Indian', 'comfort-food'),
('e23e4567-e89b-12d3-a456-426614174013', 'Avocado Toast', 'Smashed avocado on sourdough with everything bagel seasoning', 10, 1, 320, 12, ARRAY['avocado', 'toast', 'breakfast', 'quick', 'healthy'], 'American', 'breakfast'),
('f23e4567-e89b-12d3-a456-426614174014', 'Pad Thai', 'Stir-fried rice noodles with shrimp, peanuts, and lime', 30, 3, 540, 26, ARRAY['noodles', 'shrimp', 'thai', 'peanuts', 'dinner'], 'Thai', 'high-protein'),
('023e4567-e89b-12d3-a456-426614174015', 'Caprese Salad', 'Fresh mozzarella, tomatoes, and basil with balsamic glaze', 10, 2, 280, 14, ARRAY['salad', 'mozzarella', 'tomatoes', 'italian', 'lunch'], 'Italian', 'vegetarian')
ON CONFLICT (id) DO NOTHING;
