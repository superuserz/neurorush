import type { Question, QuestionCategory } from '../types';

interface QuestionTemplate {
  text: string;
  correct: string[];
  distractors: string[];
}

const questionBank: Record<QuestionCategory, QuestionTemplate[]> = {
  fruits: [
    { text: 'Name a Fruit', correct: ['Apple', 'Mango', 'Orange', 'Banana', 'Grape', 'Lemon', 'Peach', 'Plum', 'Pear', 'Kiwi', 'Cherry', 'Apricot', 'Fig', 'Guava', 'Papaya'], distractors: ['Table', 'Chair', 'Cloud', 'Brick', 'Piano', 'Shoe', 'Clock', 'Stone'] },
    { text: 'Name a Tropical Fruit', correct: ['Mango', 'Pineapple', 'Coconut', 'Papaya', 'Guava', 'Passion Fruit', 'Lychee', 'Dragon Fruit', 'Jackfruit', 'Durian'], distractors: ['Snake', 'Chair', 'Brick', 'Cloud', 'Table', 'Hammer', 'Laptop', 'Piano'] },
    { text: 'Name a Citrus Fruit', correct: ['Lemon', 'Orange', 'Lime', 'Grapefruit', 'Tangerine', 'Mandarin', 'Clementine', 'Pomelo', 'Yuzu', 'Bergamot'], distractors: ['Table', 'Chair', 'Rock', 'Cloud', 'Brick', 'Snake', 'Piano', 'Shoe'] },
    { text: 'Name a Red Fruit', correct: ['Strawberry', 'Cherry', 'Apple', 'Watermelon', 'Raspberry', 'Pomegranate', 'Cranberry', 'Red Grape', 'Blood Orange'], distractors: ['Broccoli', 'Car', 'Moon', 'Clock', 'Chair', 'Table', 'Brick', 'Piano'] },
    { text: 'Name a Berry', correct: ['Strawberry', 'Blueberry', 'Raspberry', 'Blackberry', 'Gooseberry', 'Cranberry', 'Elderberry', 'Mulberry', 'Boysenberry'], distractors: ['Table', 'Hammer', 'Brick', 'Cloud', 'Chair', 'Piano', 'Stone', 'Shoe'] },
    { text: 'Name a Stone Fruit', correct: ['Peach', 'Cherry', 'Plum', 'Apricot', 'Nectarine', 'Mango', 'Olive', 'Lychee', 'Avocado'], distractors: ['Table', 'Chair', 'Brick', 'Cloud', 'Piano', 'Snake', 'Shoe', 'Clock'] },
    { text: 'Name a Yellow Fruit', correct: ['Banana', 'Lemon', 'Pineapple', 'Mango', 'Starfruit', 'Golden Apple', 'Durian', 'Yuzu'], distractors: ['Table', 'Brick', 'Chair', 'Cloud', 'Piano', 'Shoe', 'Snake', 'Rock'] },
    { text: 'Name a Fruit with Seeds Inside', correct: ['Watermelon', 'Pomegranate', 'Kiwi', 'Fig', 'Passion Fruit', 'Papaya', 'Guava', 'Dragon Fruit'], distractors: ['Chair', 'Piano', 'Table', 'Clock', 'Shoe', 'Brick', 'Cloud', 'Stone'] },
    { text: 'Name a Fruit That Grows on a Tree', correct: ['Apple', 'Mango', 'Orange', 'Pear', 'Cherry', 'Plum', 'Peach', 'Lemon', 'Avocado', 'Coconut'], distractors: ['Table', 'Chair', 'Brick', 'Cloud', 'Piano', 'Snake', 'Shoe', 'Clock'] },
    { text: 'Name a Grape Variety', correct: ['Red Grape', 'Green Grape', 'Black Grape', 'Muscat', 'Concord', 'Cabernet', 'Merlot', 'Pinot'], distractors: ['Table', 'Hammer', 'Chair', 'Cloud', 'Piano', 'Shoe', 'Brick', 'Clock'] },
  ],

  countries: [
    { text: 'Name a Country', correct: ['France', 'Germany', 'Italy', 'Spain', 'Japan', 'India', 'Brazil', 'Mexico', 'Canada', 'Australia', 'Russia', 'China', 'USA', 'Argentina', 'Egypt'], distractors: ['Banana', 'Jupiter', 'Chair', 'Pizza', 'Cloud', 'Brick', 'Hammer', 'Piano'] },
    { text: 'Name an Asian Country', correct: ['Japan', 'China', 'India', 'South Korea', 'Thailand', 'Vietnam', 'Indonesia', 'Malaysia', 'Singapore', 'Pakistan', 'Bangladesh', 'Nepal', 'Sri Lanka'], distractors: ['Potato', 'Cloud', 'Brick', 'Chair', 'Piano', 'Hammer', 'Table', 'Snake'] },
    { text: 'Name a South American Country', correct: ['Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Venezuela', 'Bolivia', 'Ecuador', 'Paraguay', 'Uruguay', 'Guyana', 'Suriname'], distractors: ['Chair', 'Rock', 'Table', 'Brick', 'Piano', 'Snake', 'Cloud', 'Hammer'] },
    { text: 'Name a European Country', correct: ['France', 'Germany', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Greece', 'Sweden', 'Norway', 'Poland', 'Belgium', 'Switzerland', 'Austria', 'Denmark'], distractors: ['Potato', 'Jupiter', 'Banana', 'Chair', 'Cloud', 'Brick', 'Table', 'Hammer'] },
    { text: 'Name an African Country', correct: ['Nigeria', 'Egypt', 'South Africa', 'Kenya', 'Ghana', 'Ethiopia', 'Tanzania', 'Morocco', 'Algeria', 'Sudan', 'Uganda', 'Cameroon'], distractors: ['Potato', 'Jupiter', 'Banana', 'Chair', 'Cloud', 'Brick', 'Table', 'Piano'] },
    { text: 'Name a Country in North America', correct: ['USA', 'Canada', 'Mexico', 'Cuba', 'Jamaica', 'Haiti', 'Guatemala', 'Honduras', 'Costa Rica', 'Panama'], distractors: ['Potato', 'Brick', 'Chair', 'Cloud', 'Piano', 'Snake', 'Table', 'Rock'] },
    { text: 'Name an Island Country', correct: ['Japan', 'Indonesia', 'Philippines', 'Sri Lanka', 'Cuba', 'Iceland', 'Malta', 'Maldives', 'Fiji', 'Singapore', 'New Zealand', 'Ireland'], distractors: ['Potato', 'Chair', 'Brick', 'Cloud', 'Piano', 'Hammer', 'Table', 'Snake'] },
    { text: 'Name a Country Bordering France', correct: ['Spain', 'Belgium', 'Germany', 'Italy', 'Switzerland', 'Luxembourg', 'Monaco', 'Andorra'], distractors: ['Potato', 'Jupiter', 'Brick', 'Chair', 'Cloud', 'Piano', 'Table', 'Snake'] },
    { text: 'Name a Country With a Monarchy', correct: ['UK', 'Japan', 'Spain', 'Sweden', 'Norway', 'Netherlands', 'Belgium', 'Denmark', 'Thailand', 'Saudi Arabia', 'Morocco'], distractors: ['Potato', 'Brick', 'Chair', 'Cloud', 'Piano', 'Snake', 'Table', 'Rock'] },
    { text: 'Name a Country in the G7', correct: ['USA', 'UK', 'France', 'Germany', 'Italy', 'Japan', 'Canada'], distractors: ['Potato', 'Jupiter', 'Brick', 'Chair', 'Cloud', 'Piano', 'Snake', 'Table'] },
  ],

  colors: [
    { text: 'Name a Color', correct: ['Purple', 'Green', 'Blue', 'Red', 'Yellow', 'Orange', 'Pink', 'Cyan', 'Magenta', 'White', 'Black', 'Brown', 'Gray', 'Teal', 'Violet'], distractors: ['Elephant', 'Laptop', 'Snake', 'Chair', 'Table', 'Piano', 'Cloud', 'Brick'] },
    { text: 'Name a Warm Color', correct: ['Orange', 'Red', 'Yellow', 'Pink', 'Coral', 'Amber', 'Scarlet', 'Crimson', 'Magenta', 'Peach', 'Gold', 'Maroon'], distractors: ['Purple', 'Blue', 'Green', 'Chair', 'Piano', 'Cloud', 'Brick', 'Snake'] },
    { text: 'Name a Cool Color', correct: ['Blue', 'Green', 'Cyan', 'Teal', 'Indigo', 'Violet', 'Turquoise', 'Aqua', 'Navy', 'Mint', 'Periwinkle'], distractors: ['Red', 'Orange', 'Yellow', 'Table', 'Rock', 'Chair', 'Brick', 'Snake'] },
    { text: 'Name a Shade of Blue', correct: ['Navy', 'Sky Blue', 'Cyan', 'Teal', 'Cobalt', 'Azure', 'Indigo', 'Turquoise', 'Royal Blue', 'Baby Blue', 'Cerulean'], distractors: ['Red', 'Orange', 'Chair', 'Piano', 'Table', 'Brick', 'Snake', 'Rock'] },
    { text: 'Name a Shade of Green', correct: ['Lime', 'Olive', 'Mint', 'Emerald', 'Forest Green', 'Sage', 'Jade', 'Chartreuse', 'Teal', 'Hunter Green', 'Seafoam'], distractors: ['Red', 'Orange', 'Chair', 'Piano', 'Table', 'Brick', 'Snake', 'Rock'] },
    { text: 'Name a Primary Color', correct: ['Red', 'Blue', 'Yellow'], distractors: ['Purple', 'Green', 'Orange', 'Pink', 'Brown', 'Chair', 'Brick', 'Piano', 'Cloud', 'Snake'] },
    { text: 'Name a Color in the Rainbow', correct: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'], distractors: ['Pink', 'Brown', 'Chair', 'Brick', 'Piano', 'Cloud', 'Snake', 'Table'] },
    { text: 'Name a Neutral Color', correct: ['White', 'Black', 'Gray', 'Beige', 'Cream', 'Ivory', 'Taupe', 'Charcoal', 'Khaki', 'Brown'], distractors: ['Red', 'Blue', 'Chair', 'Brick', 'Piano', 'Cloud', 'Snake', 'Table'] },
    { text: 'Name a Color Associated with Nature', correct: ['Green', 'Brown', 'Blue', 'Yellow', 'Orange', 'Teal', 'Olive', 'Aqua', 'Earthy Red'], distractors: ['Neon Pink', 'Chair', 'Piano', 'Brick', 'Cloud', 'Snake', 'Table', 'Rock'] },
    { text: 'Name a Color That Contains Red', correct: ['Orange', 'Purple', 'Pink', 'Magenta', 'Maroon', 'Crimson', 'Coral', 'Salmon', 'Rose'], distractors: ['Blue', 'Green', 'Chair', 'Brick', 'Piano', 'Cloud', 'Snake', 'Table'] },
  ],

  sports: [
    { text: 'Name a Sport', correct: ['Soccer', 'Tennis', 'Baseball', 'Cricket', 'Basketball', 'Golf', 'Rugby', 'Swimming', 'Boxing', 'Hockey', 'Volleyball', 'Cycling', 'Rowing', 'Archery', 'Surfing'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Snake'] },
    { text: 'Name a Water Sport', correct: ['Swimming', 'Surfing', 'Rowing', 'Diving', 'Kayaking', 'Water Polo', 'Sailing', 'Wakeboarding', 'Windsurfing', 'Synchronized Swimming', 'Polo'], distractors: ['Boxing', 'Cloud', 'Cycling', 'Table', 'Chair', 'Piano', 'Brick', 'Snake'] },
    { text: 'Name a Team Sport', correct: ['Basketball', 'Football', 'Hockey', 'Volleyball', 'Soccer', 'Baseball', 'Rugby', 'Cricket', 'Water Polo', 'Handball', 'Lacrosse', 'Polo'], distractors: ['Potato', 'Tennis', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Snake'] },
    { text: 'Name an Olympic Sport', correct: ['Swimming', 'Athletics', 'Gymnastics', 'Cycling', 'Boxing', 'Wrestling', 'Archery', 'Fencing', 'Rowing', 'Judo', 'Shooting', 'Triathlon', 'Taekwondo'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Cloud', 'Brick', 'Piano', 'Snake'] },
    { text: 'Name a Racket Sport', correct: ['Tennis', 'Badminton', 'Squash', 'Table Tennis', 'Racquetball', 'Padel', 'Pickleball'], distractors: ['Soccer', 'Swimming', 'Boxing', 'Chair', 'Brick', 'Piano', 'Cloud', 'Table'] },
    { text: 'Name a Combat Sport', correct: ['Boxing', 'Wrestling', 'Judo', 'Karate', 'Taekwondo', 'MMA', 'Kickboxing', 'Muay Thai', 'Fencing', 'Jiu-Jitsu'], distractors: ['Soccer', 'Swimming', 'Golf', 'Chair', 'Brick', 'Piano', 'Cloud', 'Table'] },
    { text: 'Name a Winter Sport', correct: ['Skiing', 'Snowboarding', 'Ice Hockey', 'Figure Skating', 'Curling', 'Bobsled', 'Biathlon', 'Luge', 'Speed Skating'], distractors: ['Soccer', 'Swimming', 'Golf', 'Chair', 'Brick', 'Piano', 'Cloud', 'Table'] },
    { text: 'Name a Sport Played With a Ball', correct: ['Soccer', 'Basketball', 'Tennis', 'Baseball', 'Golf', 'Rugby', 'Volleyball', 'Cricket', 'Bowling', 'Polo'], distractors: ['Swimming', 'Cycling', 'Chair', 'Brick', 'Piano', 'Cloud', 'Table', 'Snake'] },
    { text: 'Name a Sport With Scoring Points', correct: ['Basketball', 'Tennis', 'Soccer', 'Volleyball', 'Badminton', 'Table Tennis', 'Squash', 'Football', 'Rugby'], distractors: ['Chair', 'Brick', 'Piano', 'Cloud', 'Table', 'Snake', 'Rock', 'Hammer'] },
    { text: 'Name a Sport in the Summer Olympics', correct: ['Swimming', 'Athletics', 'Gymnastics', 'Cycling', 'Boxing', 'Judo', 'Shooting', 'Archery', 'Fencing', 'Rowing', 'Triathlon'], distractors: ['Skiing', 'Bobsled', 'Chair', 'Brick', 'Piano', 'Cloud', 'Table', 'Snake'] },
  ],

  movies: [
    { text: 'Name a Marvel Movie', correct: ['Avengers', 'Iron Man', 'Thor', 'Spider-Man', 'Black Panther', 'Captain America', 'Hulk', 'Ant-Man', 'Doctor Strange', 'Black Widow', 'Guardians of the Galaxy'], distractors: ['Potato', 'Batman', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Snake'] },
    { text: 'Name a Disney Movie', correct: ['Frozen', 'Moana', 'Lion King', 'Aladdin', 'Tangled', 'Mulan', 'Cinderella', 'Bambi', 'Pocahontas', 'Sleeping Beauty', 'Beauty and the Beast', 'Ratatouille'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Cloud', 'Piano', 'Snake'] },
    { text: 'Name an Action Movie', correct: ['Die Hard', 'John Wick', 'Mad Max', 'Speed', 'Terminator', 'Matrix', 'Top Gun', 'Mission Impossible', 'Gladiator', 'The Dark Knight', 'Inception', 'Fast & Furious'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name a Horror Movie', correct: ['Halloween', 'The Shining', 'It', 'Get Out', 'A Quiet Place', 'Scream', 'Conjuring', 'Insidious', 'Hereditary', 'The Exorcist', 'Paranormal Activity'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name a Sci-Fi Movie', correct: ['Star Wars', 'Interstellar', 'Avatar', 'Blade Runner', 'Arrival', 'Dune', 'Gravity', '2001: A Space Odyssey', 'Alien', 'E.T.', 'Back to the Future'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name an Animated Movie', correct: ['Toy Story', 'Finding Nemo', 'Shrek', 'The Incredibles', 'Up', 'Coco', 'Soul', 'Turning Red', 'Moana', 'Frozen', 'Zootopia', 'Wall-E'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name a Movie Franchise', correct: ['Star Wars', 'Fast & Furious', 'Mission Impossible', 'Jurassic Park', 'James Bond', 'Indiana Jones', 'Harry Potter', 'Lord of the Rings', 'Transformers'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name a Best Picture Oscar Winner', correct: ['Parasite', 'Nomadland', 'CODA', 'Everything Everywhere', 'Oppenheimer', 'Titanic', 'Gladiator', 'The Godfather', 'Schindler\'s List'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name a Movie Set in Space', correct: ['Interstellar', 'Gravity', 'The Martian', 'Alien', 'Star Wars', 'Avatar', '2001: A Space Odyssey', 'Guardians of the Galaxy', 'Apollo 13'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name a Pixar Movie', correct: ['Toy Story', 'Finding Nemo', 'The Incredibles', 'Up', 'Coco', 'Soul', 'Turning Red', 'Luca', 'Wall-E', 'Ratatouille', 'Cars', 'Brave', 'Inside Out'], distractors: ['Potato', 'Chair', 'Cloud', 'Table', 'Brick', 'Piano', 'Snake', 'Rock'] },
  ],

  animals: [
    { text: 'Name an Animal', correct: ['Tiger', 'Lion', 'Elephant', 'Giraffe', 'Zebra', 'Gorilla', 'Cheetah', 'Wolf', 'Bear', 'Eagle', 'Dolphin', 'Shark', 'Penguin', 'Kangaroo', 'Panda'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Snake'] },
    { text: 'Name a Sea Animal', correct: ['Shark', 'Dolphin', 'Whale', 'Octopus', 'Seal', 'Sea Turtle', 'Crab', 'Lobster', 'Jellyfish', 'Seahorse', 'Manta Ray', 'Starfish', 'Swordfish'], distractors: ['Chair', 'Potato', 'Moon', 'Rock', 'Table', 'Brick', 'Piano', 'Hammer'] },
    { text: 'Name a Bird', correct: ['Eagle', 'Parrot', 'Penguin', 'Owl', 'Flamingo', 'Peacock', 'Hawk', 'Swan', 'Toucan', 'Crow', 'Hummingbird', 'Pelican', 'Albatross', 'Ostrich'], distractors: ['Chair', 'Potato', 'Moon', 'Rock', 'Table', 'Brick', 'Piano', 'Snake'] },
    { text: 'Name a Big Cat', correct: ['Tiger', 'Lion', 'Cheetah', 'Leopard', 'Jaguar', 'Puma', 'Cougar', 'Snow Leopard', 'Clouded Leopard', 'Ocelot'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Snake'] },
    { text: 'Name a Mammal', correct: ['Dog', 'Cat', 'Elephant', 'Whale', 'Bat', 'Lion', 'Gorilla', 'Kangaroo', 'Dolphin', 'Bear', 'Wolf', 'Giraffe', 'Panda', 'Tiger'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Reptile', correct: ['Crocodile', 'Snake', 'Lizard', 'Turtle', 'Gecko', 'Iguana', 'Komodo Dragon', 'Chameleon', 'Alligator', 'Monitor Lizard'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Hammer'] },
    { text: 'Name an Insect', correct: ['Bee', 'Butterfly', 'Ant', 'Beetle', 'Dragonfly', 'Grasshopper', 'Firefly', 'Wasp', 'Moth', 'Ladybug', 'Cricket', 'Mosquito'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Pet Animal', correct: ['Dog', 'Cat', 'Rabbit', 'Hamster', 'Goldfish', 'Parrot', 'Guinea Pig', 'Turtle', 'Snake', 'Chinchilla', 'Ferret', 'Lizard'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name an African Animal', correct: ['Lion', 'Elephant', 'Giraffe', 'Zebra', 'Cheetah', 'Gorilla', 'Hippo', 'Rhino', 'Warthog', 'Wildebeest', 'Meerkat', 'Hyena'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name an Animal That Can Fly', correct: ['Eagle', 'Bat', 'Butterfly', 'Bee', 'Owl', 'Parrot', 'Hummingbird', 'Dragonfly', 'Swan', 'Pelican', 'Toucan', 'Crow'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
  ],

  objects: [
    { text: 'Name a Kitchen Item', correct: ['Knife', 'Fork', 'Spoon', 'Bowl', 'Plate', 'Pan', 'Pot', 'Ladle', 'Spatula', 'Whisk', 'Grater', 'Colander', 'Blender', 'Toaster'], distractors: ['Tiger', 'Moon', 'Cloud', 'Planet', 'Brick', 'Snake', 'Rock', 'Hammer'] },
    { text: 'Name a Tool', correct: ['Hammer', 'Drill', 'Wrench', 'Screwdriver', 'Saw', 'Pliers', 'Chisel', 'Level', 'Tape Measure', 'Clamp', 'Crowbar', 'Sandpaper', 'Nail Gun'], distractors: ['Banana', 'Cloud', 'Tiger', 'Moon', 'Brick', 'Piano', 'Snake', 'Rock'] },
    { text: 'Name a Musical Instrument', correct: ['Guitar', 'Piano', 'Violin', 'Drums', 'Flute', 'Trumpet', 'Cello', 'Saxophone', 'Harp', 'Clarinet', 'Trombone', 'Ukulele', 'Accordion', 'Oboe'], distractors: ['Chair', 'Potato', 'Moon', 'Table', 'Brick', 'Tiger', 'Cloud', 'Snake'] },
    { text: 'Name a Vehicle', correct: ['Car', 'Truck', 'Motorcycle', 'Bus', 'Train', 'Plane', 'Ship', 'Helicopter', 'Bicycle', 'Scooter', 'Submarine', 'Rocket', 'Tram'], distractors: ['Chair', 'Potato', 'Moon', 'Brick', 'Piano', 'Cloud', 'Snake', 'Rock'] },
    { text: 'Name a Piece of Furniture', correct: ['Chair', 'Table', 'Sofa', 'Bed', 'Desk', 'Wardrobe', 'Bookshelf', 'Cabinet', 'Dresser', 'Stool', 'Bench', 'Ottoman'], distractors: ['Tiger', 'Cloud', 'Piano', 'Brick', 'Snake', 'Moon', 'Rock', 'Hammer'] },
    { text: 'Name an Electronic Device', correct: ['Phone', 'Laptop', 'TV', 'Tablet', 'Camera', 'Headphones', 'Speaker', 'Smartwatch', 'Console', 'Router', 'Drone', 'E-Reader'], distractors: ['Chair', 'Potato', 'Moon', 'Brick', 'Piano', 'Snake', 'Rock', 'Cloud'] },
    { text: 'Name a Sports Equipment', correct: ['Ball', 'Bat', 'Racket', 'Goal', 'Net', 'Helmet', 'Gloves', 'Cleats', 'Skates', 'Surfboard', 'Ski', 'Bow', 'Javelin'], distractors: ['Chair', 'Potato', 'Moon', 'Brick', 'Piano', 'Snake', 'Cloud', 'Rock'] },
    { text: 'Name a Weapon', correct: ['Sword', 'Bow', 'Shield', 'Spear', 'Axe', 'Dagger', 'Crossbow', 'Cannon', 'Catapult', 'Mace', 'Trident'], distractors: ['Chair', 'Potato', 'Cloud', 'Piano', 'Brick', 'Snake', 'Rock', 'Hammer'] },
    { text: 'Name a School Supply', correct: ['Pencil', 'Pen', 'Eraser', 'Ruler', 'Notebook', 'Backpack', 'Scissors', 'Glue', 'Compass', 'Protractor', 'Highlighter', 'Stapler'], distractors: ['Chair', 'Tiger', 'Moon', 'Brick', 'Piano', 'Snake', 'Cloud', 'Rock'] },
    { text: 'Name Something in a Bathroom', correct: ['Toothbrush', 'Soap', 'Shampoo', 'Mirror', 'Towel', 'Toilet', 'Sink', 'Shower', 'Bathtub', 'Razor', 'Toothpaste', 'Comb'], distractors: ['Tiger', 'Cloud', 'Piano', 'Brick', 'Snake', 'Moon', 'Rock', 'Hammer'] },
  ],

  logos: [
    { text: 'Name a Tech Brand', correct: ['Apple', 'Google', 'Microsoft', 'Samsung', 'Meta', 'Amazon', 'Tesla', 'Intel', 'Sony', 'LG', 'Huawei', 'Xiaomi', 'NVIDIA', 'IBM', 'Oracle'], distractors: ['Snake', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Car Brand', correct: ['Toyota', 'Honda', 'BMW', 'Ford', 'Audi', 'Mercedes', 'Tesla', 'Volkswagen', 'Hyundai', 'Kia', 'Ferrari', 'Lamborghini', 'Porsche', 'Nissan', 'Chevrolet'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Social Media Platform', correct: ['Instagram', 'Twitter', 'Facebook', 'TikTok', 'YouTube', 'Snapchat', 'LinkedIn', 'Pinterest', 'Reddit', 'Discord', 'Twitch', 'Telegram'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Streaming Service', correct: ['Netflix', 'Disney+', 'HBO Max', 'Hulu', 'Amazon Prime', 'Apple TV+', 'Peacock', 'Paramount+', 'Crunchyroll', 'Spotify'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Gaming Brand', correct: ['PlayStation', 'Xbox', 'Nintendo', 'Steam', 'Epic Games', 'Ubisoft', 'EA', 'Activision', 'Riot Games', 'Rockstar', 'Blizzard'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Fashion Brand', correct: ['Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Versace', 'Armani', 'Burberry', 'Dior', 'Balenciaga', 'Hermes', 'Fendi'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Food Brand', correct: ["Kellogg's", "McDonald's", 'Coca-Cola', 'Pepsi', 'Nestlé', 'Kraft', 'Heinz', 'Lay\'s', 'Oreo', 'Doritos', "Lay's"], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name an Airline', correct: ['Emirates', 'Delta', 'United', 'British Airways', 'Lufthansa', 'Qatar Airways', 'Singapore Airlines', 'Air France', 'American Airlines', 'Southwest'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Bank', correct: ['JPMorgan', 'Bank of America', 'HSBC', 'Citibank', 'Barclays', 'Goldman Sachs', 'Wells Fargo', 'Deutsche Bank', 'BNP Paribas'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Luxury Watch Brand', correct: ['Rolex', 'Omega', 'Patek Philippe', 'Tag Heuer', 'Breitling', 'IWC', 'Hublot', 'Cartier', 'Audemars Piguet', 'Seiko'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
  ],

  brands: [
    { text: 'Name a Fast Food Brand', correct: ["McDonald's", 'Burger King', 'Subway', 'KFC', "Wendy's", 'Taco Bell', 'Chick-fil-A', "Domino's", 'Pizza Hut', "Popeyes", 'Five Guys', 'Shake Shack'], distractors: ['Chair', 'Potato', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Sneaker Brand', correct: ['Nike', 'Adidas', 'Puma', 'Reebok', 'Vans', 'Converse', 'New Balance', 'Skechers', 'ASICS', 'Under Armour', 'Fila', 'Jordan', 'Salomon'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Clothing Brand', correct: ['Zara', 'H&M', 'Gucci', 'Prada', "Levi's", 'Ralph Lauren', 'Calvin Klein', 'Tommy Hilfiger', 'Gap', 'Uniqlo', 'Mango', 'Forever 21', 'ASOS'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Coffee Brand', correct: ['Starbucks', 'Nespresso', 'Lavazza', 'Illy', 'Dunkin\'', 'Tim Hortons', 'Peet\'s Coffee', 'Costa Coffee', 'Blue Bottle', 'Folgers'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Soft Drink Brand', correct: ['Coca-Cola', 'Pepsi', 'Sprite', '7UP', 'Fanta', 'Mountain Dew', 'Dr Pepper', 'Red Bull', 'Monster', 'Gatorade', 'Powerade'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Cosmetics Brand', correct: ['L\'Oréal', 'MAC', 'Maybelline', 'NYX', 'Fenty Beauty', 'Charlotte Tilbury', 'Urban Decay', 'NARS', 'Clinique', 'Estée Lauder', 'Revlon'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Luxury Brand', correct: ['Gucci', 'Chanel', 'Louis Vuitton', 'Hermès', 'Prada', 'Versace', 'Dior', 'Burberry', 'Rolex', 'Cartier', 'Ferrari', 'Lamborghini'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Sports Brand', correct: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance', 'ASICS', 'Lululemon', 'The North Face', 'Patagonia', 'Wilson', 'Yonex'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Chocolate Brand', correct: ['Cadbury', 'Lindt', 'Ferrero Rocher', 'Toblerone', 'Kit Kat', 'Snickers', 'Twix', 'Milka', 'Godiva', 'Dove', 'Hershey\'s'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
    { text: 'Name a Video Game Brand/Console', correct: ['PlayStation', 'Xbox', 'Nintendo Switch', 'Game Boy', 'Atari', 'Sega', 'Steam Deck', 'Nintendo 64', 'GameCube', 'Wii'], distractors: ['Potato', 'Chair', 'Moon', 'Table', 'Brick', 'Piano', 'Cloud', 'Rock'] },
  ],
};

const categories: QuestionCategory[] = Object.keys(questionBank) as QuestionCategory[];

function correctCountForDifficulty(difficulty: number): number {
  return difficulty <= 2 ? 2 : 1;
}

export function getRandomQuestion(category?: QuestionCategory, difficulty = 1): Question {
  const cat = category ?? categories[Math.floor(Math.random() * categories.length)];
  const pool = questionBank[cat];
  const template = pool[Math.floor(Math.random() * pool.length)];

  const numCorrect = correctCountForDifficulty(difficulty);
  const selectedCorrect = shuffle(template.correct).slice(0, Math.min(numCorrect, template.correct.length));
  const selectedDistractors = shuffle(template.distractors).slice(0, 4);

  const options = shuffle([...selectedCorrect, ...selectedDistractors]);

  return {
    id: `q_${Date.now()}_${Math.random()}`,
    text: template.text,
    correctAnswers: selectedCorrect,
    options,
    category: cat,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
