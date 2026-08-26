import { ReviewModel } from '@/modules/reviews/review.model';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

const FIRST_NAMES = [
    'James', 'Sarah', 'Michael', 'Priya', 'David', 'Emma', 'Oliver', 'Aisha',
    'Daniel', 'Sophia', 'Liam', 'Maya', 'Noah', 'Hannah', 'Ethan', 'Amelia',
    'Lucas', 'Chloe', 'Henry', 'Isla', 'Jack', 'Zara', 'Thomas', 'Leah',
    'William', 'Nadia', 'George', 'Freya', 'Harry', 'Yasmin',];

const LAST_INITIALS = ['W', 'K', 'T', 'R', 'L', 'M', 'H', 'S', 'B', 'C', 'P', 'N', 'A', 'D', 'G'];

const COMMENTS = [
    'The Reserve No. 12 is unlike anything I have found elsewhere. The packaging alone is an experience and the blend is rich from the first draw. This is what a luxury smoke shop should feel like, start to finish.',
    'Fast delivery and the cigars arrived in perfect condition, each one nested and protected. The draw was even and the flavour held through the whole smoke. I will definitely order again from this shop.',
    'Excellent selection of cigarettes, far better than the usual online catalogues. Quality matches what I expected from a specialist store and every pack was sealed, dated, and well presented on arrival.',
    'Customer service was helpful when I asked about delivery times and the order was packed with real care. Nothing rattled, nothing crushed, and the parcel was discreet. That attention to detail is why I came back.',
    'Tobacco freshness was outstanding, with a clean aroma as soon as I opened the pouch. The cut was consistent and it burned evenly in my pipe. This is now my regular supplier for leaf and accessories.',
    'Smooth checkout and tracked delivery made the whole process easy. The site feels like a specialist shop rather than a generic marketplace. From browsing to the doorstep, everything was clear and reliable.',
    'Loved the accessories range. The cutter I bought is solid, well finished, and arrived in proper packaging. It sits nicely with the rest of my kit and feels like a piece I will keep for years.',
    'Premium feel from the website through to the parcel. The tissue, the box, and the note inside all made it feel considered. Highly recommended if you want quality stock without the usual cheap presentation.',
    'Great prices for genuine stock and everything was sealed and well presented. I compared a few UK shops before ordering and this one was the most consistent. The products look and feel exactly as described.',
    'The cigars had a beautiful draw and the packaging protected them perfectly on the journey. No damage to the wrappers, no dry spots, and a very even burn. I have already added another box to my next order.',
];

const TAGS = ['Verified Buyer', 'Repeat Customer', 'UK Customer', 'Inner Circle'];

const buildReviews = (count: number) =>
    Array.from({ length: count }, (_, index) => {
        const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_INITIALS[index % LAST_INITIALS.length]}.`;
        const rating = index % 11 === 0 ? 3 : index % 4 === 0 ? 4 : 5;
        return {
            name,
            text: COMMENTS[index % COMMENTS.length],
            rating,
            tag: TAGS[index % TAGS.length],
        };
    });

export const seedReviews = async (): Promise<void> => {
    await connectDatabase();

    try {
        const reviews = buildReviews(10);
        await ReviewModel.deleteMany({});
        await ReviewModel.insertMany(reviews);
        logger.info('✅ Reviews seeded successfully', { count: reviews.length });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedReviews()
        .then(() => {
            logger.info('🎉 Reviews seed completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Reviews seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
