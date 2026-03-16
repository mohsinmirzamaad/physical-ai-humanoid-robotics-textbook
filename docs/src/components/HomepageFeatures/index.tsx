import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Physical AI Foundations',
    description: (
      <>
        Understand the principles of embodied intelligence — how perception,
        reasoning, and action combine in physical systems that interact with
        the real world.
      </>
    ),
  },
  {
    title: 'ROS 2 & Simulation',
    description: (
      <>
        Build and simulate humanoid robots using ROS 2 and Gazebo. Learn
        real-world robotics workflows from sensor integration to motion
        planning.
      </>
    ),
  },
  {
    title: 'End-to-End Deployment',
    description: (
      <>
        Go from simulation to hardware. Cover control architectures, learning
        from demonstration, and safe deployment of AI-powered humanoid
        robots.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
