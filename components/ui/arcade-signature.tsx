import styles from "./arcade-signature.module.css";

/** Decorative CGH signature; does not affect gameplay or interactive controls. */
export function ArcadeSignature() {
  return <span className={styles.signature} aria-hidden="true"><span /><span /><span /></span>;
}
